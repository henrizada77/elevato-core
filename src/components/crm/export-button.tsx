import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportCsv, exportPdf, exportXlsx, type ExportRow } from "@/lib/crm/export";

interface Props {
  rows: ExportRow[];
  filename: string;
  title?: string;
  disabled?: boolean;
}

export function ExportButton({ rows, filename, title, disabled }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled || rows.length === 0}>
          <Download className="h-4 w-4 mr-1" /> Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportCsv(rows, filename)}>CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportXlsx(rows, filename)}>Excel (.xlsx)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportPdf(rows, filename, title ?? filename)}>PDF</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
