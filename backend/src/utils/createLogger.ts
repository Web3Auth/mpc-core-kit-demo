import * as Sentry from "@sentry/node";
import { createLogger } from "@toruslabs/loglevel-sentry";

export default (name: string) => createLogger(name, Sentry);
