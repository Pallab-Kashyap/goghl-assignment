import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Folder,
  Target,
  LogOut,
  Wallet,
  ChevronLeft,
  ChevronRight,
  User,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/transactions", icon: ArrowLeftRight, label: "Transactions" },
  { to: "/categories", icon: Folder, label: "Categories" },
  { to: "/budgets", icon: Target, label: "Budgets" },
];

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onMenuClick}>
          <Menu className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <img src="/money-wise.png" className="w-8 h-8" alt="FinanceFlow" />
          <span className="font-semibold text-lg">FinanceFlow</span>
        </div>
      </div>
    </header>
  );
}

interface AppSidebarProps {
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

export function AppSidebar({
  mobileMenuOpen = false,
  setMobileMenuOpen,
}: AppSidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleNavClick = () => {
    if (isMobile && setMobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  const SidebarContent = ({ inSheet = false }: { inSheet?: boolean }) => (
    <>
      {/* Logo - only show in desktop or if not in sheet */}
      {!inSheet && (
        <div
          className="flex items-center gap-3 p-4 border-b border-sidebar-border cursor-pointer"
          onClick={() => navigate("/dashboard")}
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-xl text-sidebar-primary-foreground shrink-0">
            <img src="/money-wise.png" alt="FinanceFlow" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-lg text-sidebar-foreground">
              FinanceFlow
            </span>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={handleNavClick}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                isActive
                  ? inSheet
                    ? "bg-accent text-primary"
                    : "bg-sidebar-accent text-sidebar-primary"
                  : inSheet
                    ? "text-foreground hover:bg-accent hover:text-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )
            }
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {(inSheet || !collapsed) && (
              <span className="font-medium">{item.label}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse button - only on desktop */}
      {!inSheet && (
        <div className="p-3 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 mr-2" />
                <span>Collapse</span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* User section */}
      <div
        className={cn(
          "p-3 border-t",
          inSheet ? "border-border" : "border-sidebar-border",
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3",
                inSheet
                  ? "text-foreground hover:bg-accent hover:text-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                !inSheet && collapsed && "justify-center px-2",
              )}
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.image || undefined} />
                <AvatarFallback
                  className={cn(
                    "text-sm",
                    inSheet
                      ? "bg-primary text-primary-foreground"
                      : "bg-sidebar-primary text-sidebar-primary-foreground",
                  )}
                >
                  {user?.name?.[0]?.toUpperCase() ||
                    user?.email?.[0]?.toUpperCase() ||
                    "U"}
                </AvatarFallback>
              </Avatar>
              {(inSheet || !collapsed) && (
                <div className="flex-1 text-left truncate">
                  <p className="text-sm font-medium truncate">
                    {user?.name || "User"}
                  </p>
                  <p
                    className={cn(
                      "text-xs truncate",
                      inSheet
                        ? "text-muted-foreground"
                        : "text-sidebar-foreground/60",
                    )}
                  >
                    {user?.email}
                  </p>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.name || "User"}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  // Mobile: Use Sheet
  if (isMobile) {
    return (
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="flex items-center gap-3">
              <img
                src="/money-wise.png"
                className="w-10 h-10"
                alt="FinanceFlow"
              />
              <span>FinanceFlow</span>
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 flex flex-col overflow-hidden">
            <SidebarContent inSheet />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Regular sidebar
  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar transition-all duration-300 border-r border-sidebar-border",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <SidebarContent />
    </aside>
  );
}
