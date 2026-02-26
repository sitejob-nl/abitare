import { useState, useRef, useCallback, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useProfiles } from "@/hooks/useUsers";
import { cn } from "@/lib/utils";

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export function MentionTextarea({
  value,
  onChange,
  placeholder = "Voeg een notitie toe... Typ @ om iemand te taggen",
  rows = 2,
  className,
}: MentionTextareaProps) {
  const { data: users = [] } = useProfiles();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionFilter, setSuggestionFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const filteredUsers = users
    .filter((u) => u.is_active !== false)
    .filter((u) => {
      if (!suggestionFilter) return true;
      const name = (u.full_name || u.email || "").toLowerCase();
      return name.includes(suggestionFilter.toLowerCase());
    })
    .slice(0, 6);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      const cursorPos = e.target.selectionStart;
      const textBeforeCursor = newValue.slice(0, cursorPos);

      // Check if we're in a mention context
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");
      if (lastAtIndex >= 0) {
        const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
        // Only show suggestions if there's no space before @ (or it's at start)
        const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : " ";
        if ((charBeforeAt === " " || charBeforeAt === "\n" || lastAtIndex === 0) && !textAfterAt.includes(" ")) {
          setShowSuggestions(true);
          setSuggestionFilter(textAfterAt);
          setMentionStartPos(lastAtIndex);
          setSelectedIndex(0);
          return;
        }
      }
      setShowSuggestions(false);
      setMentionStartPos(null);
    },
    [onChange]
  );

  const insertMention = useCallback(
    (user: { id: string; full_name: string | null; email: string }) => {
      if (mentionStartPos === null) return;
      const displayName = user.full_name || user.email;
      const before = value.slice(0, mentionStartPos);
      const cursorPos = textareaRef.current?.selectionStart || value.length;
      const after = value.slice(cursorPos);
      const newValue = `${before}@${displayName} ${after}`;
      onChange(newValue);
      setShowSuggestions(false);
      setMentionStartPos(null);

      // Focus and move cursor
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = mentionStartPos + displayName.length + 2; // @ + name + space
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 0);
    },
    [mentionStartPos, value, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showSuggestions) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredUsers.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && filteredUsers[selectedIndex]) {
        e.preventDefault();
        insertMention(filteredUsers[selectedIndex]);
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      }
    },
    [showSuggestions, filteredUsers, selectedIndex, insertMention]
  );

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative flex-1">
      <Textarea
        ref={textareaRef}
        placeholder={placeholder}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        rows={rows}
        className={className}
      />
      {showSuggestions && filteredUsers.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute left-0 bottom-full mb-1 z-50 w-64 rounded-lg border border-border bg-popover shadow-lg overflow-hidden"
        >
          <div className="p-1">
            <p className="text-[10px] font-medium text-muted-foreground px-2 py-1">
              Personen
            </p>
            {filteredUsers.map((user, index) => (
              <button
                key={user.id}
                type="button"
                className={cn(
                  "flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm text-left transition-colors",
                  index === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(user);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                  {(user.full_name || user.email || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.full_name || user.email}
                  </p>
                  {user.full_name && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {user.email}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Extract mentioned user IDs from a note content string.
 * Matches @FullName patterns against the user list.
 */
export function extractMentionedUserIds(
  content: string,
  users: { id: string; full_name: string | null; email: string }[]
): string[] {
  const mentionedIds: string[] = [];
  const mentionRegex = /@([^\n@]+?)(?=\s|$)/g;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    const mentionName = match[1].trim();
    const user = users.find(
      (u) =>
        (u.full_name && u.full_name.toLowerCase() === mentionName.toLowerCase()) ||
        u.email.toLowerCase() === mentionName.toLowerCase()
    );
    if (user && !mentionedIds.includes(user.id)) {
      mentionedIds.push(user.id);
    }
  }

  return mentionedIds;
}
