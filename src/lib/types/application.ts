export type ApplicationStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface Applicant {
  id: string;
  name: string;
  department: string;
  email: string;
  employeeId: string;
}

export interface TravelInfo {
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  purpose: string;
  transportType: 'flight' | 'train' | 'car' | 'other';
  estimatedCost: number;
}

export interface TravelApplication {
  id: string;
  applicant: Applicant;
  travelInfo: TravelInfo;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectReason?: string;
  comments?: string;
}

export interface ApplicationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  draft: number;
  cancelled: number;
  totalCost: number;
  monthlyTrend: MonthlyTrend[];
}

export interface MonthlyTrend {
  month: string;
  count: number;
  cost: number;
}

export interface DepartmentStat {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
}