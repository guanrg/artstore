#!/usr/bin/env node

const { spawn } = require("child_process")
const net = require("net")

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
  console.log("Starting infrastructure...")
  const infra = runCommand(["run", "infra:up"], "infra")
  await waitForExit(infra, "infra")

  console.log("Starting Medusa...")
  const medusa = runCommand(["run", "dev:medusa"], "medusa")
  managed.push(medusa)
  await waitForPort(9000).then(
    () => console.log("Medusa is reachable on port 9000"),
    () => console.warn("Medusa did not become reachable on port 9000 in time, continuing startup...")
  )

  console.log("Starting Strapi...")
  const strapi = runCommand(["run", "dev:strapi"], "strapi")
  managed.push(strapi)
  await waitForPort(1337).then(
    () => console.log("Strapi is reachable on port 1337"),
    () => console.warn("Strapi did not become reachable on port 1337 in time, continuing startup...")
  )

  console.log("Starting Storefront...")
  const storefront = runCommand(["run", "dev:storefront"], "storefront")
  managed.push(storefront)
  await waitForPort(3000).then(
    () => console.log("Storefront is reachable on port 3000"),
    () => console.warn("Storefront did not become reachable on port 3000 in time, continuing startup...")
  )

  console.log("\nAll services are up.")

  for (const [name, child] of [
    ["medusa", medusa],
    ["strapi", strapi],
    ["storefront", storefront],
  ]) {
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
