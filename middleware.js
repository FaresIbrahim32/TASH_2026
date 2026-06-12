import { proxy, config } from "./proxy";

export function middleware(request) {
  return proxy(request);
}

export { config };
