export const PLAN_OPTIONS = [
  "Arcade Night",
  "Cozy Coffee",
  "Sunset Walk",
  "Dinner & a Movie",
  "Mini Golf",
  "Bookstore Wander",
  "Surprise Me",
];

export const FOOD_OPTIONS: { label: string; emoji: string }[] = [
  { label: "Italian", emoji: "🍝" },
  { label: "Sushi", emoji: "🍣" },
  { label: "Pizza", emoji: "🍕" },
  { label: "Tacos", emoji: "🌮" },
  { label: "Burgers", emoji: "🍔" },
  { label: "Ramen", emoji: "🍜" },
  { label: "Brunch", emoji: "🥞" },
  { label: "Dessert First", emoji: "🍰" },
  { label: "You Pick", emoji: "💕" },
];

export function formatDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatTime(value: string): string {
  const [hourStr, minuteStr] = value.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return value;
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
}
