import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptySearchProps {
  query?: string;
  onReset?: () => void;
}

export function EmptySearch({ query, onReset }: EmptySearchProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <SearchX className="w-16 h-16 text-muted-foreground mb-6" />
      
      <h3 className="text-2xl font-semibold mb-2">
        No encontramos resultados
      </h3>
      
      {query && (
        <p className="text-lg text-muted-foreground mb-6">
          para "{query}"
        </p>
      )}
      
      <div className="max-w-md space-y-4">
        <p className="text-sm text-muted-foreground">
          Sugerencias:
        </p>
        <ul className="text-sm text-muted-foreground space-y-2 text-left">
          <li>• Prueba con términos más generales</li>
          <li>• Verifica la ortografía de las palabras</li>
          <li>• Usa menos palabras clave</li>
          <li>• Intenta con sinónimos o palabras relacionadas</li>
        </ul>
        
        {onReset && (
          <Button
            variant="outline"
            onClick={onReset}
            className="mt-6"
          >
            Limpiar búsqueda
          </Button>
        )}
      </div>
    </div>
  );
}
