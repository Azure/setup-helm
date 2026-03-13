import {run} from './run.js'
import * as core from '@actions/core'

run().catch(core.setFailed)
