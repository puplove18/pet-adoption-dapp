// i would like to have the new browser session to be LOGIN screen...

const KEY = "pawledger_session";

function readFrom(storage) {
  try {
    return JSON.parse(storage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}

export function getSession() {
  try {
    const session = readFrom(sessionStorage);
    if (session) return session;

    // Drop old persistent sessions from previous versions.
    localStorage.removeItem(KEY);
    return null;
  } catch {
    return null;
  }
}

export function setSession(session) {
  sessionStorage.setItem(KEY, JSON.stringify(session));
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore legacy cleanup failures
  }
}

export function clearSession() {
  sessionStorage.removeItem(KEY);
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore legacy cleanup failures
  }
}
