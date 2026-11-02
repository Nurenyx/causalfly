import { loadProjectEnvironment } from "./load-environment";
import { hostCapabilities } from "../src/lib/web/host-capabilities";
loadProjectEnvironment();
console.log(JSON.stringify(hostCapabilities(), null, 2));
