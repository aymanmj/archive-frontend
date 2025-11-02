import { Card, CardContent, CardHeader, CardTitle } from './Card';

export default function StatCard({ title, value, hint }: { title: string; value: string | number; hint?: string; }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-gray-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {hint && <div className="text-xs text-gray-500 mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}
