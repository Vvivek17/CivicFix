export interface PersonnelContact {
  name: string;
  role: string;
  phone: string;
  email: string;
  badgeId: string;
  status: "on_duty" | "dispatched" | "on_call";
}

export interface WardPersonnel {
  id: string;
  wardNumber: string;
  wardName: string;
  zone: string;
  headquarters: string;
  photoUrl: string;
  landmark: string;
  manager: PersonnelContact;
  worker: PersonnelContact & {
    unit: string;
    vehicleNumber: string;
    proximityKm: number;
    lastPing: string;
  };
  coverageLocalities: string[];
}

export const WARDS_REGISTRY: Record<string, WardPersonnel> = {
  koramangala: {
    id: "ward-151",
    wardNumber: "Ward 151",
    wardName: "Koramangala",
    zone: "South Zone",
    headquarters: "BBMP Ward 151 Office, 5th Block, Koramangala",
    photoUrl: "/images/locations/koramangala.jpg",
    landmark: "100 Feet Road & 5th Block Tech Hub",
    manager: {
      name: "Rajesh V. Kumar",
      role: "Executive Engineer & Ward Manager",
      phone: "+91 94806 85151",
      email: "mgr.ward151@bbmp.gov.in",
      badgeId: "BBMP-MGR-151",
      status: "on_duty",
    },
    worker: {
      name: "Suresh Gowda",
      role: "Rapid Response Crew Lead",
      unit: "South-4 Rapid Works & Sanitation Team",
      phone: "+91 98451 22340",
      email: "worker.suresh@bbmp.gov.in",
      badgeId: "BBMP-WRK-408",
      vehicleNumber: "KA-01-EA-4921 (Quick Response Van)",
      proximityKm: 0.8,
      lastPing: "2 mins ago",
      status: "dispatched",
    },
    coverageLocalities: ["Koramangala", "ST Bed", "Koramangala 1st-8th Block", "Ejipura Border"],
  },
  indiranagar: {
    id: "ward-080",
    wardNumber: "Ward 80",
    wardName: "Hoysala Nagar / Indiranagar",
    zone: "East Zone",
    headquarters: "BBMP Sub-Division Office, 100 Feet Road, Indiranagar",
    photoUrl: "/images/locations/indiranagar.jpg",
    landmark: "100 Feet Road & Defence Colony Tree Boulevard",
    manager: {
      name: "Anitha Sundaram",
      role: "Assistant Executive Engineer / Ward In-Charge",
      phone: "+91 94806 85080",
      email: "mgr.ward80@bbmp.gov.in",
      badgeId: "BBMP-MGR-080",
      status: "on_duty",
    },
    worker: {
      name: "Manjunath K.",
      role: "Field Maintenance Supervisor",
      unit: "East-2 Roads & Electrical Squad",
      phone: "+91 98452 77190",
      email: "worker.manjunath@bbmp.gov.in",
      badgeId: "BBMP-WRK-219",
      vehicleNumber: "KA-03-GA-1102 (Utility Truck)",
      proximityKm: 1.1,
      lastPing: "Just now",
      status: "on_duty",
    },
    coverageLocalities: ["Indiranagar", "HAL 2nd Stage", "Defence Colony", "Doopanahalli"],
  },
  hsr: {
    id: "ward-174",
    wardNumber: "Ward 174",
    wardName: "HSR Layout",
    zone: "Bommanahalli Zone",
    headquarters: "BBMP Ward Office, Sector 2, HSR Layout",
    photoUrl: "/images/locations/hsr-layout.jpg",
    landmark: "Sector 2 & Agara Lake Civic Corridor",
    manager: {
      name: "Pradeep R. Hegde",
      role: "Ward Superintendent / Zonal Officer",
      phone: "+91 94806 85174",
      email: "mgr.ward174@bbmp.gov.in",
      badgeId: "BBMP-MGR-174",
      status: "on_duty",
    },
    worker: {
      name: "Basavaraj Patil",
      role: "Field Engineer & Sanitation Lead",
      unit: "Sector Response Team-1",
      phone: "+91 98453 99210",
      email: "worker.basavaraj@bbmp.gov.in",
      badgeId: "BBMP-WRK-512",
      vehicleNumber: "KA-51-M-3420 (Maintenance Rover)",
      proximityKm: 1.4,
      lastPing: "4 mins ago",
      status: "dispatched",
    },
    coverageLocalities: ["HSR Layout", "HSR Sectors 1-7", "Agara", "Silk Board Junction"],
  },
  jayanagar: {
    id: "ward-153",
    wardNumber: "Ward 153",
    wardName: "Jayanagar 4th Block",
    zone: "South Zone",
    headquarters: "Jayanagar Ward Complex, 11th Main, 4th T Block",
    photoUrl: "/images/locations/jayanagar.jpg",
    landmark: "4th T Block Shopping Complex & South End Circle",
    manager: {
      name: "Dr. H. Venkatesh",
      role: "Senior Environmental & Works Engineer",
      phone: "+91 94806 85153",
      email: "mgr.ward153@bbmp.gov.in",
      badgeId: "BBMP-MGR-153",
      status: "on_duty",
    },
    worker: {
      name: "Chetan Kumar",
      role: "Civic Works Field Lead",
      unit: "South-1 Pothole & Drainage Squad",
      phone: "+91 98454 44320",
      email: "worker.chetan@bbmp.gov.in",
      badgeId: "BBMP-WRK-105",
      vehicleNumber: "KA-05-AB-7744 (Emergency Works)",
      proximityKm: 0.6,
      lastPing: "1 min ago",
      status: "on_duty",
    },
    coverageLocalities: ["Jayanagar", "Jayanagar 1st-9th Block", "Tilak Nagar", "South End"],
  },
  domlur: {
    id: "ward-112",
    wardNumber: "Ward 112",
    wardName: "Domlur",
    zone: "East Zone",
    headquarters: "BBMP Sub-Division Office, Domlur Main Road",
    photoUrl: "/images/locations/domlur.jpg",
    landmark: "Domlur Flyover & Tech Park Avenue",
    manager: {
      name: "Shashi Rekha",
      role: "Ward Operations Officer",
      phone: "+91 94806 85112",
      email: "mgr.ward112@bbmp.gov.in",
      badgeId: "BBMP-MGR-112",
      status: "on_duty",
    },
    worker: {
      name: "Venkatesh Nayak",
      role: "Rapid Response Crew Lead",
      unit: "East-5 Sanitation & Infrastructure Team",
      phone: "+91 98455 11980",
      email: "worker.venkatesh@bbmp.gov.in",
      badgeId: "BBMP-WRK-334",
      vehicleNumber: "KA-01-EE-8890 (Response Unit)",
      proximityKm: 0.9,
      lastPing: "3 mins ago",
      status: "dispatched",
    },
    coverageLocalities: ["Domlur", "Domlur Layout", "Amarjyoti Layout", "Command Hospital"],
  },
  ejipura: {
    id: "ward-148",
    wardNumber: "Ward 148",
    wardName: "Ejipura",
    zone: "South Zone",
    headquarters: "BBMP Ward Division Office, Ejipura Main Road",
    photoUrl: "/images/locations/ejipura.jpg",
    landmark: "Ejipura Main Road & Signal Market",
    manager: {
      name: "N. Ramesh",
      role: "Assistant Engineer / Triage Officer",
      phone: "+91 94806 85148",
      email: "mgr.ward148@bbmp.gov.in",
      badgeId: "BBMP-MGR-148",
      status: "on_duty",
    },
    worker: {
      name: "Anand Murthy",
      role: "Field Response Specialist",
      unit: "South-7 Field Operations",
      phone: "+91 98456 66730",
      email: "worker.anand@bbmp.gov.in",
      badgeId: "BBMP-WRK-671",
      vehicleNumber: "KA-01-MF-1234 (Field Unit)",
      proximityKm: 0.7,
      lastPing: "Just now",
      status: "on_duty",
    },
    coverageLocalities: ["Ejipura", "Vivek Nagar", "Austin Town", "Vannarpet"],
  },
  central: {
    id: "ward-111",
    wardNumber: "Ward 111",
    wardName: "Central Municipal Ward",
    zone: "Central Zone",
    headquarters: "BBMP Head Office, Corporation Circle, NR Square",
    photoUrl: "/images/locations/central.jpg",
    landmark: "Corporation Circle & Vidhana Soudha / MG Road",
    manager: {
      name: "Sandeep V. Rao",
      role: "Chief Municipal Coordinator / Zonal Manager",
      phone: "+91 94806 85111",
      email: "mgr.central@bbmp.gov.in",
      badgeId: "BBMP-MGR-111",
      status: "on_duty",
    },
    worker: {
      name: "Ravi Kiran",
      role: "Central Quick Response Lead",
      unit: "Central Mobile Unit-1",
      phone: "+91 98457 88900",
      email: "worker.ravikiran@bbmp.gov.in",
      badgeId: "BBMP-WRK-101",
      vehicleNumber: "KA-01-G-9000 (Central Mobile)",
      proximityKm: 1.2,
      lastPing: "2 mins ago",
      status: "on_duty",
    },
    coverageLocalities: ["Central", "MG Road", "Brigade Road", "Shivajinagar", "Richmond Town"],
  },
};

/**
 * Normalizes locality string and maps it to the closest Ward Personnel.
 */
export function getWardPersonnel(locality: string): WardPersonnel {
  const norm = (locality || "").toLowerCase().trim();
  if (norm.includes("kora") || norm.includes("koramangala")) return WARDS_REGISTRY.koramangala;
  if (norm.includes("indira") || norm.includes("indiranagar") || norm.includes("hoysala")) return WARDS_REGISTRY.indiranagar;
  if (norm.includes("hsr")) return WARDS_REGISTRY.hsr;
  if (norm.includes("jaya") || norm.includes("jayanagar")) return WARDS_REGISTRY.jayanagar;
  if (norm.includes("domlur")) return WARDS_REGISTRY.domlur;
  if (norm.includes("eji") || norm.includes("ejipura")) return WARDS_REGISTRY.ejipura;
  return WARDS_REGISTRY.central;
}

export function getAllWards(): WardPersonnel[] {
  return Object.values(WARDS_REGISTRY);
}

export interface DispatchNotificationInfo extends WardPersonnel {
  notificationChannel: string;
  notificationTimestamp: string;
  dispatchStatus: string;
  autoDispatched: boolean;
  notificationSummary: string;
}

export function getDispatchInfo(locality: string, createdAt: string): DispatchNotificationInfo {
  const personnel = getWardPersonnel(locality);
  const createdDate = new Date(createdAt);
  const formattedTime = !isNaN(createdDate.getTime())
    ? createdDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : "Just now";

  return {
    ...personnel,
    notificationChannel: "BBMP Geofence SMS & VHF Radio",
    notificationTimestamp: formattedTime,
    dispatchStatus: "Delivered & Acknowledged",
    autoDispatched: true,
    notificationSummary: `Ward Manager ${personnel.manager.name} and Field Worker ${personnel.worker.name} were automatically notified via Geofence dispatch at ${formattedTime}.`,
  };
}
