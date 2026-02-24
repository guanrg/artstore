#!/usr/bin/env node

const { spawn } = require("child_process")
const net = require("net")
const { execFile } = require("child_process")

const isWindows = process.platform === "win32"
const npmCmd = isWindows ? "npm.cmd" : "npm"
const npmExecPath = process.env.npm_execpath

function runCommand(args, name, options = {}) {
  const command = npmExecPath ? process.execPath : npmCmd
  const commandArgs = npmExecPath ? [npmExecPath, ...args] : args
  const child = spawn(command, commandArgs, {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    shell: !npmExecPath && isWindows,
    ...options,
  })

  child.stdout.on("data", (data) => {
    process.stdout.write(`[${name}] ${data}`)
  })

  child.stderr.on("data", (data) => {
    process.stderr.write(`[${name}] ${data}`)
  })

  return child
}

function waitForExit(child, name) {
  return new Promise((resolve, reject) => {
    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${name} exited with code ${code}`))
    })
  })
}

function waitForPort(port, timeoutMs = 120000) {
  const start = Date.now()

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = net.createConnection({ port, host: "127.0.0.1" })

      socket.on("connect", () => {
        socket.end()
        resolve()
      })

      socket.on("error", () => {
        socket.destroy()
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timed out waiting for port ${port}`))
          return
        }
        setTimeout(tryConnect, 1000)
      })
    }

    tryConnect()
  })
}

function canConnect(port, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host: "127.0.0.1" })
    const timer = setTimeout(() => {
      socket.destroy()
      resolve(false)
    }, timeoutMs)

    socket.on("connect", () => {
      clearTimeout(timer)
      socket.end()
      resolve(true)
    })

    socket.on("error", () => {
      clearTimeout(timer)
      socket.destroy()
      resolve(false)
    })
  })
}

function execFileAsync(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        reject(error)
        return
      }
      resolve({ stdout, stderr })
    })
  })
}

async function findListeningPidsOnWindows(port) {
  const { stdout } = await execFileAsync("netstat", ["-ano", "-p", "tcp"])
  const pids = new Set()

  for (const line of stdout.split(/\r?\n/)) {
    const cols = line.trim().split(/\s+/)
    if (cols.length < 5) continue
    if (cols[0].toUpperCase() !== "TCP") continue
    if (cols[3].toUpperCase() !== "LISTENING") continue
    if (!cols[1].endsWith(`:${port}`)) continue
    pids.add(cols[4])
  }

  return [...pids]
}

async function killPidOnWindows(pid) {
  await execFileAsync("taskkill", ["/PID", String(pid), "/T", "/F"])
}

async function cleanPortsIfRequested() {
  if (!process.argv.includes("--clean")) return
  const ports = [9000, 1337, 3000]
  console.log("Cleaning occupied service ports...")

  if (!isWindows) {
    console.warn("Port clean mode is only implemented for Windows. Skipping.")
    return
  }

  for (const port of ports) {
    const pids = await findListeningPidsOnWindows(port)
    if (!pids.length) {
      console.log(`Port ${port}: no listening process`)
      continue
    }

    for (const pid of pids) {
      try {
        await killPidOnWindows(pid)
        console.log(`Port ${port}: killed PID ${pid}`)
      } catch (error) {
        console.warn(`Port ${port}: failed to kill PID ${pid} (${error.message})`)
      }
    }
  }
}

const managed = []
let shuttingDown = false

function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true

  console.log(`\nReceived ${signal}, stopping all services...`)
  for (const child of managed) {
    if (!child.killed) {
      child.kill("SIGINT")
    }
  }

  setTimeout(() => {
    process.exit(0)
  }, 300)
}

process.on("SIGINT", () => shutdown("SIGINT"))
process.on("SIGTERM", () => shutdown("SIGTERM"))

async function start() {
  await cleanPortsIfRequested()

  console.log("Starting infrastructure...")
  const infra = runCommand(["run", "infra:up"], "infra")
  await waitForExit(infra, "infra")

  let medusa = null
  if (await canConnect(9000)) {
    console.log("Port 9000 is already in use, skipping Medusa startup.")
  } else {
    console.log("Starting Medusa...")
    medusa = runCommand(["run", "dev:medusa"], "medusa")
    managed.push(medusa)
    await waitForPort(9000).then(
      () => console.log("Medusa is reachable on port 9000"),
      () => console.warn("Medusa did not become reachable on port 9000 in time, continuing startup...")
    )
  }

  let strapi = null
  if (await canConnect(1337)) {
    console.log("Port 1337 is already in use, skipping Strapi startup.")
  } else {
    console.log("Starting Strapi...")
    strapi = runCommand(["run", "dev:strapi"], "strapi")
    managed.push(strapi)
    await waitForPort(1337).then(
      () => console.log("Strapi is reachable on port 1337"),
      () => console.warn("Strapi did not become reachable on port 1337 in time, continuing startup...")
    )
  }

  let storefront = null
  if (await canConnect(3000)) {
    console.log("Port 3000 is already in use, skipping Storefront startup.")
  } else {
    console.log("Starting Storefront...")
    storefront = runCommand(["run", "dev:storefront"], "storefront")
    managed.push(storefront)
    await waitForPort(3000).then(
      () => console.log("Storefront is reachable on port 3000"),
      () => console.warn("Storefront did not become reachable on port 3000 in time, continuing startup...")
    )
  }

  console.log("\nAll services are up.")

  for (const [name, child] of [
    ["medusa", medusa],
    ["strapi", strapi],
    ["storefront", storefront],
  ]) {
    if (!child) continue
    child.on("exit", (code) => {
      if (shuttingDown) return
      console.error(`${name} exited unexpectedly with code ${code}. Stopping all services...`)
      shutdown("service-exit")
      process.exit(code || 1)
    })
  }
}

start().catch((error) => {
  console.error(`Failed to start services: ${error.message}`)
  shutdown("startup-failure")
  process.exit(1)
})
