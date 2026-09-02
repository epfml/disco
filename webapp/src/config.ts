export interface Config {
  readonly serverUrl: URL;
}

export const CONFIG: Config = {
  serverUrl: resolveServerUrl(),
};

/**
 * The server URL is taken from VITE_SERVER_URL when set. When it isn't (the
 * development default), it is derived from the host serving the webapp so that
 * `vite --host` also works from another device on the LAN: the phone loads the
 * webapp at http://<LAN-IP>:1351 and reaches the server at http://<LAN-IP>:8080
 * without anyone hardcoding <LAN-IP>.
 */
function resolveServerUrl(): URL {
  const configured = import.meta.env.VITE_SERVER_URL;
  if (configured && configured != "localhost") return new URL("", configured);

  const port = import.meta.env.VITE_SERVER_PORT || "8080";
  const { protocol, hostname } = window.location;
  return new URL(`${protocol}//${hostname}:${port}`);
}
