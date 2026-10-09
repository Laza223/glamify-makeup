import { describe, it, expect } from "vitest";
import { isAdminPanelPath } from "@/middleware";

describe("isAdminPanelPath (redirect a /admin/login sin sesión)", () => {
  it.each(["/admin", "/admin/", "/admin/pedidos", "/admin/pedidos/abc", "/admin/loginx"])(
    "%s es panel",
    (p) => expect(isAdminPanelPath(p)).toBe(true),
  );

  it.each(["/admin/login", "/admin/login/", "/cuenta", "/auth/callback", "/administrar"])(
    "%s no es panel",
    (p) => expect(isAdminPanelPath(p)).toBe(false),
  );
});
