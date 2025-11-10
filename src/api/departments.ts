// src/api/departments.ts

import api from "./apiClient";

export type DepartmentDto = { id: number; name: string };

export async function listDepartments(): Promise<DepartmentDto[]> {
  const { data } = await api.get("/departments");
  // توقع أن الـ API يعيد مصفوفة {id,name}
  return data as DepartmentDto[];
}
