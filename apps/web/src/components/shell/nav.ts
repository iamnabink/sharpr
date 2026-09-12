import {
  BookOpen,
  Calendar,
  Compass,
  Dumbbell,
  Library,
  LineChart,
  RotateCcw,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: { href: string; label: string }[];
}

export const NAV: NavItem[] = [
  { href: "/", label: "Today", icon: Calendar },
  {
    href: "/practice",
    label: "Practice",
    icon: Dumbbell,
    children: [
      { href: "/practice/random", label: "Random" },
      { href: "/practice/speak", label: "Speak" },
      { href: "/practice/quick", label: "Quick" },
      { href: "/practice/story", label: "Story" },
      { href: "/practice/podcast", label: "Podcast" },
      { href: "/practice/debate", label: "Debate" },
      { href: "/practice/interview", label: "Interview" },
      { href: "/practice/tech", label: "Tech Talk" },
      { href: "/practice/scenario", label: "Scenarios" },
      { href: "/sessions", label: "Sessions" },
    ],
  },
  {
    href: "/learn",
    label: "Learn",
    icon: BookOpen,
    children: [
      { href: "/learn/topics", label: "Topics" },
      { href: "/learn/knowledge", label: "General knowledge" },
      { href: "/learn/books", label: "Books" },
      { href: "/learn/resources", label: "Resources" },
      { href: "/learn/vocabulary", label: "Vocabulary" },
    ],
  },
  {
    href: "/review",
    label: "Review",
    icon: RotateCcw,
    children: [
      { href: "/review/recordings", label: "Recordings" },
      { href: "/review/retry", label: "Retry queue" },
      { href: "/review/notes", label: "Notes" },
    ],
  },
  { href: "/progress", label: "Progress", icon: LineChart },
  { href: "/library", label: "Library", icon: Library },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const MOBILE_NAV = [
  { href: "/", label: "Today", icon: Calendar },
  { href: "/practice", label: "Practice", icon: Dumbbell },
  { href: "/learn", label: "Learn", icon: BookOpen },
  { href: "/review", label: "Review", icon: RotateCcw },
  { href: "/library", label: "Library", icon: Compass },
];
