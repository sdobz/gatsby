const nodeFetch = require(`node-fetch`)

const { performance } = require(`perf_hooks`)

const bootstrapTime = performance.now()

let apiServer
let apiPath

class BenchMeta {
  constructor() {
    this.flushing = false // Started flushing?
    this.flushed = false // Completed flushing?
    this.crashed = false
    this.localTime = new Date().toJSON()
    this.events = {
      // TODO: we should also have access to node's timing data and see how long it took before bootstrapping this script
      bootstrapTime,
      instanceTime: performance.now(),
      start: 0,
      bootstrap: 0,
      stop: 0,
    }
    this.started = false
  }

  markStart() {
    if (this.started) {
      this.crashed = "Error: Should not call markStart() more than once"
      console.error("gatsby-plugin-benchmarks: " + this.crashed)
      TODO // report error.
    }
    this.events.start = performance.now()
    this.started = true
  }

  markDataPoint(name) {
    this.events[name] = performance.now()
  }

  async markStop() {
    if (!this.events.start) {
      this.crashed =
        "Error: Should not call markStop() before calling markStart()"
      console.error("gatsby-plugin-benchmarks: " + this.crashed)
      TODO // report error.
    }
    this.events.stop = performance.now()
    return this.flush()
  }

  async flush() {
    this.flushing = true

    return nodeFetch(`https://${apiServer}${apiPath}`, {
      method: `POST`,
      headers: {
        "content-type": `application/json`,
        // "user-agent": this.getUserAgent(),
      },
      body: JSON.stringify({
        time: this.localTime,
        // This is a stub. We'll expand this as we determine what to log when running a benchmark
        sessionId: JSON.stringify(this.events),
      }),
    })
      .then(res => {
        this.flushed = true
        // Note: res.text returns a promise
        return res.text()
      })
      .then(text => console.log("Server response:", text))
  }
}

process.on(`exit`, async () => {
  if (!benchMeta.crashed) {
    // This should not happen (benchmarks are controlled) and have been reported already
  } else if (!benchMeta.flushing) {
    console.log(
      "gatsby-plugin-benchmarks: This is process.exit(); Not yet flushed, will flush now but it's probably too late..."
    )
    benchMeta.markDataPoint("post-build")
    return benchMeta.markStop()
  } else if (!benchMeta.flushed) {
    // Started to flush but the completion promise did not fire yet
    // This should't happen unless the reporting crashed hard
  }
})

const benchMeta = new BenchMeta()

async function onPreInit(api, options) {
  // console.log("# onPreInit")

  // This should be set in the gatsby-config of the site when enabling this plugin
  apiServer = options.server
  apiPath = options.path
  console.log(
    "gatsby-plugin-benchmarks: Will post benchmark data to",
    "https://" + apiServer + apiPath
  )

  benchMeta.markStart()
  benchMeta.markDataPoint("pre-init")
}

async function onPreBootstrap(...args) {
  // console.log("# onPreBootstrap")
  benchMeta.markDataPoint("pre-bootstrap")
}

async function onPreBuild(...args) {
  // console.log("# onPreBuild")
  benchMeta.markDataPoint("pre-build")
}

async function onPostBuild(api, options) {
  // console.log("# onPostBuild")
  benchMeta.markDataPoint("post-build")
  return benchMeta.markStop(options)
}

module.exports = { onPreInit, onPreBootstrap, onPreBuild, onPostBuild }
