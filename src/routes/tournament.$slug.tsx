import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/tournament/$slug")({
  component: () => <Outlet />,
});
