// happy-dom + Testing Library jest-dom matchers
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Her test sonrası DOM'u temizle. Vitest 4.x globals: false varsayılanında
// otomatik cleanup yok — render birikmeleri "found multiple elements"
// hatalarına neden oluyor.
afterEach(() => {
  cleanup();
});
