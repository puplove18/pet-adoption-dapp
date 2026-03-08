import { getSession } from "./session";


// for login function
function authHeaders() {
  const s = getSession();
  if (!s?.org || !s?.userId) return {};
  return {
    "x-org": s.org,
    "x-user": s.userId,
  };
}

async function parseErrorMessage(res) {
  let backendError = "";

  try {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await res.json();
      backendError = String(body?.error ?? "").trim();
    } else {
      backendError = (await res.text()).trim();
    }
  } catch {
    backendError = "";
  }

  if (res.status === 403) {
    if (backendError.includes("Unauthorized userId")) {
      return "That user ID is not approved for this organization yet. Try one of the suggested IDs.";
    }
    return backendError || "You do not have permission to do that.";
  }

  if (res.status === 401) {
    return "Please log in again.";
  }

  if (res.status >= 500) {
    return "Server issue right now. Please try again in a moment.";
  }

  return backendError || `Request failed (${res.status}).`;
}

export async function apiGet(url) {
  const res = await fetch(url, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

export async function apiPost(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" 
      , ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

export async function apiPut(url, body) {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

export async function apiUploadImage(animalId, file) {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(`/api/animals/${animalId}/image`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: formData,
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

export async function apiPatch(url, body) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

export async function apiDelete(url) {
  const res = await fetch(url, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}
