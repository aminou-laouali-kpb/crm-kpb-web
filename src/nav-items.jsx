import { HomeIcon } from "lucide-react";

/**
 * Central place for defining the navigation items metadata.
 * Pages are lazy-loaded in App.jsx, so we don't import components here.
 */
export const navItems = [
  {
    title: "Home",
    to: "/",
    icon: <HomeIcon className="h-4 w-4" />,
  },
];