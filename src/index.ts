import {run} from './run'
import * as core from '@actions/core'

run().catch(core.setFailed)
