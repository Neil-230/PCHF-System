import * as React from "react";

// Sidebar wrapper
function Sidebar({ children }: { children: React.ReactNode }) {
  return (
    <div className="d-flex flex-column bg-light border-end vh-100" style={{ width: "250px" }}>
      {children}
    </div>
  );
}

// Sidebar header
function SidebarHeader({ children }: { children: React.ReactNode }) {
  return <div className="p-3 border-bottom fw-bold">{children}</div>;
}

// Sidebar content (scrollable area)
function SidebarContent({ children }: { children: React.ReactNode }) {
  return <div className="flex-grow-1 overflow-auto">{children}</div>;
}

// Sidebar footer
function SidebarFooter({ children }: { children: React.ReactNode }) {
  return <div className="p-3 border-top">{children}</div>;
}

// Sidebar menu (list)
function SidebarMenu({ children }: { children: React.ReactNode }) {
  return <ul className="list-unstyled m-0">{children}</ul>;
}

// Sidebar menu item
function SidebarMenuItem({ children }: { children: React.ReactNode }) {
  return <li className="w-100">{children}</li>;
}

// Sidebar menu button
function SidebarMenuButton({
  children,
  isActive = false,
  className = "",
  ...props
}: React.ComponentProps<"button"> & { isActive?: boolean }) {
  const base = "btn w-100 text-start rounded-0";
  const activeClass = isActive ? "btn-primary" : "btn-light";

  return (
    <button
      className={`${base} ${activeClass} ${className}`}
      aria-pressed={isActive}
      {...props}
    >
      {children}
    </button>
  );
}

export {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
};
