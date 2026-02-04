import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Users, FileText, ShoppingCart, Package, Calendar, Wrench } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/use-mobile";

interface SearchResult {
  id: string;
  type: "customer" | "quote" | "order" | "product" | "service";
  title: string;
  subtitle?: string;
  url: string;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const searchResults: SearchResult[] = [];

    try {
      // Search customers
      const { data: customers } = await supabase
        .from("customers")
        .select("id, first_name, last_name, company_name, customer_number")
        .or(`last_name.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,company_name.ilike.%${searchQuery}%`)
        .limit(5);

      customers?.forEach((c) => {
        const name = c.company_name || `${c.first_name || ""} ${c.last_name}`.trim();
        searchResults.push({
          id: c.id,
          type: "customer",
          title: name,
          subtitle: `Klant #${c.customer_number}`,
          url: `/customers/${c.id}`,
        });
      });

      // Search quotes
      const { data: quotes } = await supabase
        .from("quotes")
        .select("id, quote_number, customers!inner(last_name, company_name)")
        .or(`quote_number.eq.${parseInt(searchQuery) || 0}`)
        .limit(5);

      quotes?.forEach((q: any) => {
        const customerName = q.customers?.company_name || q.customers?.last_name || "Onbekend";
        searchResults.push({
          id: q.id,
          type: "quote",
          title: `Offerte #${q.quote_number}`,
          subtitle: customerName,
          url: `/quotes/${q.id}`,
        });
      });

      // Search orders
      const { data: orders } = await supabase
        .from("orders")
        .select("id, order_number, customers!inner(last_name, company_name)")
        .or(`order_number.eq.${parseInt(searchQuery) || 0}`)
        .limit(5);

      orders?.forEach((o: any) => {
        const customerName = o.customers?.company_name || o.customers?.last_name || "Onbekend";
        searchResults.push({
          id: o.id,
          type: "order",
          title: `Order #${o.order_number}`,
          subtitle: customerName,
          url: `/orders/${o.id}`,
        });
      });

      // Search products
      const { data: products } = await supabase
        .from("products")
        .select("id, name, article_code")
        .or(`name.ilike.%${searchQuery}%,article_code.ilike.%${searchQuery}%`)
        .limit(5);

      products?.forEach((p) => {
        searchResults.push({
          id: p.id,
          type: "product",
          title: p.name,
          subtitle: p.article_code,
          url: `/products`,
        });
      });

      // Search service tickets
      const { data: tickets } = await supabase
        .from("service_tickets")
        .select("id, ticket_number, subject")
        .or(`subject.ilike.%${searchQuery}%,ticket_number.eq.${parseInt(searchQuery) || 0}`)
        .limit(5);

      tickets?.forEach((t) => {
        searchResults.push({
          id: t.id,
          type: "service",
          title: t.subject,
          subtitle: `Ticket #${t.ticket_number}`,
          url: `/service/${t.id}`,
        });
      });

      setResults(searchResults);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    search(debouncedQuery);
  }, [debouncedQuery, search]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.url);
    onOpenChange(false);
    setQuery("");
  };

  const getIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "customer":
        return <Users className="h-4 w-4 text-muted-foreground" />;
      case "quote":
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      case "order":
        return <ShoppingCart className="h-4 w-4 text-muted-foreground" />;
      case "product":
        return <Package className="h-4 w-4 text-muted-foreground" />;
      case "service":
        return <Wrench className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTypeLabel = (type: SearchResult["type"]) => {
    switch (type) {
      case "customer":
        return "Klanten";
      case "quote":
        return "Offertes";
      case "order":
        return "Orders";
      case "product":
        return "Producten";
      case "service":
        return "Service";
    }
  };

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Zoeken naar klanten, offertes, orders..." 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isLoading ? "Zoeken..." : query.length < 2 ? "Typ minimaal 2 karakters..." : "Geen resultaten gevonden."}
        </CommandEmpty>
        
        {Object.entries(groupedResults).map(([type, items]) => (
          <CommandGroup key={type} heading={getTypeLabel(type as SearchResult["type"])}>
            {items.map((result) => (
              <CommandItem
                key={result.id}
                value={`${result.type}-${result.id}`}
                onSelect={() => handleSelect(result)}
                className="cursor-pointer"
              >
                {getIcon(result.type)}
                <span className="ml-2">{result.title}</span>
                {result.subtitle && (
                  <span className="ml-2 text-muted-foreground text-xs">{result.subtitle}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
      <div className="border-t p-2 text-xs text-muted-foreground text-center">
        <CommandShortcut>⌘K</CommandShortcut> om te openen
      </div>
    </CommandDialog>
  );
}
