import DatabaseExplorer from "@/components/admin/DatabaseExplorer";

export const metadata = {
  title: "Database Explorer | Conquer ERP",
  description: "Read-only database inspector and records lookup for administrators."
};

export default function DatabasePage() {
  return <DatabaseExplorer />;
}
