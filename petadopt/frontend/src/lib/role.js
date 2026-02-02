export function getRole() {
  return localStorage.getItem("role") || "public";
}

export function setRole(role) {
  localStorage.setItem("role", role);
}
