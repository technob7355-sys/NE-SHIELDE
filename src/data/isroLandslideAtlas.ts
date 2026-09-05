// ISRO / NRSC Landslide Atlas of India (February 2023)
// National Remote Sensing Centre (NRSC), Indian Space Research Organisation (ISRO)
// Department of Space, Government of India, Hyderabad-500037
// Document: NRSC-RSA-GSG-GMED-FEB 2023-TR-0002167-V1.0
// Authors: Nirmala Jain, Priyom Roy, Tapas Ranjan Martha, Punit Jalan, Aishwarya Nanda

export interface IsroDistrictRanking {
  rank: number;
  district: string;
  state: string;
  region: 'Northwest Himalayas' | 'Northeast Himalayas' | 'Western Ghats' | 'Other';
}

export interface StateLandslideInventory {
  state: string;
  monsoon2014: number;
  monsoon2017: number;
  fieldBased: number;
  eventBased: number;
  totalLandslides: number;
  region: 'Northwest Himalayas' | 'Northeast Himalayas' | 'Western Ghats' | 'Other';
}

export interface LandmarkLandslideCase {
  id: string;
  name: string;
  state: string;
  district: string;
  date: string;
  varnesClassification: string;
  trigger: string;
  keyObservation: string;
  sensorsUsed: string[];
}

// Table 2. Landslides inventory database of India (1998-2022) - Total: 80,933 mapped landslides
export const ISRO_STATE_INVENTORY: StateLandslideInventory[] = [
  { state: 'Mizoram', monsoon2014: 1205, monsoon2017: 2254, fieldBased: 0, eventBased: 8926, totalLandslides: 12385, region: 'Northeast Himalayas' },
  { state: 'Uttarakhand', monsoon2014: 1593, monsoon2017: 455, fieldBased: 1419, eventBased: 7752, totalLandslides: 11219, region: 'Northwest Himalayas' },
  { state: 'Tripura', monsoon2014: 56, monsoon2017: 8014, fieldBased: 0, eventBased: 0, totalLandslides: 8070, region: 'Northeast Himalayas' },
  { state: 'Arunachal Pradesh', monsoon2014: 2904, monsoon2017: 4709, fieldBased: 0, eventBased: 76, totalLandslides: 7689, region: 'Northeast Himalayas' },
  { state: 'Jammu and Kashmir', monsoon2014: 6826, monsoon2017: 19, fieldBased: 434, eventBased: 1, totalLandslides: 7280, region: 'Northwest Himalayas' },
  { state: 'Kerala', monsoon2014: 9, monsoon2017: 45, fieldBased: 0, eventBased: 5985, totalLandslides: 6039, region: 'Western Ghats' },
  { state: 'Manipur', monsoon2014: 379, monsoon2017: 4559, fieldBased: 0, eventBased: 557, totalLandslides: 5494, region: 'Northeast Himalayas' },
  { state: 'Maharashtra', monsoon2014: 97, monsoon2017: 3, fieldBased: 0, eventBased: 5012, totalLandslides: 5112, region: 'Western Ghats' },
  { state: 'Meghalaya', monsoon2014: 2127, monsoon2017: 512, fieldBased: 0, eventBased: 0, totalLandslides: 2639, region: 'Northeast Himalayas' },
  { state: 'Assam', monsoon2014: 1243, monsoon2017: 793, fieldBased: 0, eventBased: 5624, totalLandslides: 2569, region: 'Northeast Himalayas' },
  { state: 'Nagaland', monsoon2014: 54, monsoon2017: 2071, fieldBased: 0, eventBased: 7, totalLandslides: 2132, region: 'Northeast Himalayas' },
  { state: 'Sikkim', monsoon2014: 73, monsoon2017: 79, fieldBased: 0, eventBased: 1417, totalLandslides: 1569, region: 'Northeast Himalayas' },
  { state: 'Himachal Pradesh', monsoon2014: 922, monsoon2017: 172, fieldBased: 413, eventBased: 54, totalLandslides: 1561, region: 'Northwest Himalayas' },
  { state: 'Karnataka', monsoon2014: 82, monsoon2017: 19, fieldBased: 0, eventBased: 993, totalLandslides: 1094, region: 'Western Ghats' },
  { state: 'Tamil Nadu', monsoon2014: 79, monsoon2017: 8, fieldBased: 0, eventBased: 603, totalLandslides: 690, region: 'Western Ghats' },
  { state: 'West Bengal', monsoon2014: 24, monsoon2017: 82, fieldBased: 0, eventBased: 66, totalLandslides: 172, region: 'Northeast Himalayas' },
  { state: 'Haryana', monsoon2014: 0, monsoon2017: 100, fieldBased: 0, eventBased: 0, totalLandslides: 100, region: 'Northwest Himalayas' },
  { state: 'Ladakh', monsoon2014: 23, monsoon2017: 0, fieldBased: 0, eventBased: 0, totalLandslides: 23, region: 'Northwest Himalayas' },
  { state: 'Goa', monsoon2014: 2, monsoon2017: 1, fieldBased: 0, eventBased: 0, totalLandslides: 3, region: 'Western Ghats' },
];

// Table 3. Complete Pan-India Ranking of 147 Districts for Landslide Exposure (DEI Index)
export const ISRO_147_DISTRICT_RANKINGS: IsroDistrictRanking[] = [
  { rank: 1, district: 'Rudraprayag', state: 'Uttarakhand', region: 'Northwest Himalayas' },
  { rank: 2, district: 'Tehri Garhwal', state: 'Uttarakhand', region: 'Northwest Himalayas' },
  { rank: 3, district: 'Thrissur', state: 'Kerala', region: 'Western Ghats' },
  { rank: 4, district: 'Rajauri', state: 'Jammu and Kashmir', region: 'Northwest Himalayas' },
  { rank: 5, district: 'Palakkad', state: 'Kerala', region: 'Western Ghats' },
  { rank: 6, district: 'Poonch', state: 'Jammu and Kashmir', region: 'Northwest Himalayas' },
  { rank: 7, district: 'Malappuram', state: 'Kerala', region: 'Western Ghats' },
  { rank: 8, district: 'South District (Namchi)', state: 'Sikkim', region: 'Northeast Himalayas' },
  { rank: 9, district: 'East District (Gangtok)', state: 'Sikkim', region: 'Northeast Himalayas' },
  { rank: 10, district: 'Kozhikode', state: 'Kerala', region: 'Western Ghats' },
  { rank: 11, district: 'Imphal West', state: 'Manipur', region: 'Northeast Himalayas' },
  { rank: 12, district: 'Kodagu', state: 'Karnataka', region: 'Western Ghats' },
  { rank: 13, district: 'Wayanad', state: 'Kerala', region: 'Western Ghats' },
  { rank: 14, district: 'Jammu', state: 'Jammu and Kashmir', region: 'Northwest Himalayas' },
  { rank: 15, district: 'Ernakulam', state: 'Kerala', region: 'Western Ghats' },
  { rank: 16, district: 'Mandi', state: 'Himachal Pradesh', region: 'Northwest Himalayas' },
  { rank: 17, district: 'Udhampur', state: 'Jammu and Kashmir', region: 'Northwest Himalayas' },
  { rank: 18, district: 'Idukki', state: 'Kerala', region: 'Western Ghats' },
  { rank: 19, district: 'Chamoli', state: 'Uttarakhand', region: 'Northwest Himalayas' },
  { rank: 20, district: 'West District (Geyzing)', state: 'Sikkim', region: 'Northeast Himalayas' },
  { rank: 21, district: 'Uttarkashi', state: 'Uttarakhand', region: 'Northwest Himalayas' },
  { rank: 22, district: 'Cachar', state: 'Assam', region: 'Northeast Himalayas' },
  { rank: 23, district: 'Garhwal (Pauri)', state: 'Uttarakhand', region: 'Northwest Himalayas' },
  { rank: 24, district: 'Kottayam', state: 'Kerala', region: 'Western Ghats' },
  { rank: 25, district: 'Hamirpur', state: 'Himachal Pradesh', region: 'Northwest Himalayas' },
  { rank: 26, district: 'Kannur', state: 'Kerala', region: 'Western Ghats' },
  { rank: 27, district: 'Pulwama', state: 'Jammu and Kashmir', region: 'Northwest Himalayas' },
  { rank: 28, district: 'Thiruvananthapuram', state: 'Kerala', region: 'Western Ghats' },
  { rank: 29, district: 'Dehradun', state: 'Uttarakhand', region: 'Northwest Himalayas' },
  { rank: 30, district: 'Bilaspur', state: 'Himachal Pradesh', region: 'Northwest Himalayas' },
  { rank: 31, district: 'West Garo Hills', state: 'Meghalaya', region: 'Northeast Himalayas' },
  { rank: 32, district: 'Chamba', state: 'Himachal Pradesh', region: 'Northwest Himalayas' },
  { rank: 33, district: 'Pathanamthitta', state: 'Kerala', region: 'Western Ghats' },
  { rank: 34, district: 'East Khasi Hills', state: 'Meghalaya', region: 'Northeast Himalayas' },
  { rank: 35, district: 'Darjeeling', state: 'West Bengal', region: 'Northeast Himalayas' },
  { rank: 36, district: 'Coimbatore', state: 'Tamil Nadu', region: 'Western Ghats' },
  { rank: 37, district: 'Solan', state: 'Himachal Pradesh', region: 'Northwest Himalayas' },
  { rank: 38, district: 'Aizawl', state: 'Mizoram', region: 'Northeast Himalayas' },
  { rank: 39, district: 'Lunglei', state: 'Mizoram', region: 'Northeast Himalayas' },
  { rank: 40, district: 'Kamrup', state: 'Assam', region: 'Northeast Himalayas' },
  { rank: 41, district: 'Dindigul', state: 'Tamil Nadu', region: 'Western Ghats' },
  { rank: 42, district: 'Kathua', state: 'Jammu and Kashmir', region: 'Northwest Himalayas' },
  { rank: 43, district: 'Kanniyakumari', state: 'Tamil Nadu', region: 'Western Ghats' },
  { rank: 44, district: 'Kasaragod', state: 'Kerala', region: 'Western Ghats' },
  { rank: 45, district: 'Lawngtlai', state: 'Mizoram', region: 'Northeast Himalayas' },
  { rank: 46, district: 'Kinnaur', state: 'Himachal Pradesh', region: 'Northwest Himalayas' },
  { rank: 47, district: 'Hailakandi', state: 'Assam', region: 'Northeast Himalayas' },
  { rank: 48, district: 'Kollam', state: 'Kerala', region: 'Western Ghats' },
  { rank: 49, district: 'Goalpara', state: 'Assam', region: 'Northeast Himalayas' },
  { rank: 50, district: 'Bageshwar', state: 'Uttarakhand', region: 'Northwest Himalayas' },
  { rank: 51, district: 'North District (Mangan)', state: 'Sikkim', region: 'Northeast Himalayas' },
  { rank: 52, district: 'Anantnag', state: 'Jammu and Kashmir', region: 'Northwest Himalayas' },
  { rank: 53, district: 'Hassan', state: 'Karnataka', region: 'Western Ghats' },
  { rank: 54, district: 'Dakshina Kannada', state: 'Karnataka', region: 'Western Ghats' },
  { rank: 55, district: 'Karbi Anglong', state: 'Assam', region: 'Northeast Himalayas' },
  { rank: 56, district: 'Lohit', state: 'Arunachal Pradesh', region: 'Northeast Himalayas' },
  { rank: 57, district: 'Kullu', state: 'Himachal Pradesh', region: 'Northwest Himalayas' },
  { rank: 58, district: 'Baramulla', state: 'Jammu and Kashmir', region: 'Northwest Himalayas' },
  { rank: 59, district: 'Theni', state: 'Tamil Nadu', region: 'Western Ghats' },
  { rank: 60, district: 'Kolasib', state: 'Mizoram', region: 'Northeast Himalayas' },
  { rank: 61, district: 'Shimla', state: 'Himachal Pradesh', region: 'Northwest Himalayas' },
  { rank: 62, district: 'Kangra', state: 'Himachal Pradesh', region: 'Northwest Himalayas' },
  { rank: 63, district: 'Churachandpur', state: 'Manipur', region: 'Northeast Himalayas' },
  { rank: 64, district: 'East Garo Hills', state: 'Meghalaya', region: 'Northeast Himalayas' },
  { rank: 65, district: 'Champawat', state: 'Uttarakhand', region: 'Northwest Himalayas' },
  { rank: 66, district: 'West Khasi Hills', state: 'Meghalaya', region: 'Northeast Himalayas' },
  { rank: 67, district: 'Ri-Bhoi', state: 'Meghalaya', region: 'Northeast Himalayas' },
  { rank: 68, district: 'Nainital', state: 'Uttarakhand', region: 'Northwest Himalayas' },
  { rank: 69, district: 'Jaintia Hills', state: 'Meghalaya', region: 'Northeast Himalayas' },
  { rank: 70, district: 'Una', state: 'Himachal Pradesh', region: 'Northwest Himalayas' },
  { rank: 71, district: 'Mamit', state: 'Mizoram', region: 'Northeast Himalayas' },
  { rank: 72, district: 'Tirunelveli', state: 'Tamil Nadu', region: 'Western Ghats' },
  { rank: 73, district: 'Papum Pare', state: 'Arunachal Pradesh', region: 'Northeast Himalayas' },
  { rank: 74, district: 'Tawang', state: 'Arunachal Pradesh', region: 'Northeast Himalayas' },
  { rank: 75, district: 'West Tripura', state: 'Tripura', region: 'Northeast Himalayas' },
  { rank: 76, district: 'North Tripura', state: 'Tripura', region: 'Northeast Himalayas' },
  { rank: 77, district: 'Udupi', state: 'Karnataka', region: 'Western Ghats' },
  { rank: 78, district: 'East Siang', state: 'Arunachal Pradesh', region: 'Northeast Himalayas' },
  { rank: 79, district: 'Doda', state: 'Jammu and Kashmir', region: 'Northwest Himalayas' },
  { rank: 80, district: 'Thane', state: 'Maharashtra', region: 'Western Ghats' },
  { rank: 81, district: 'Almora', state: 'Uttarakhand', region: 'Northwest Himalayas' },
  { rank: 82, district: 'Serchhip', state: 'Mizoram', region: 'Northeast Himalayas' },
  { rank: 83, district: 'Dima Hasao (North Cachar Hills)', state: 'Assam', region: 'Northeast Himalayas' },
  { rank: 84, district: 'Lower Subansiri', state: 'Arunachal Pradesh', region: 'Northeast Himalayas' },
  { rank: 85, district: 'The Nilgiris', state: 'Tamil Nadu', region: 'Western Ghats' },
  { rank: 86, district: 'Pithoragarh', state: 'Uttarakhand', region: 'Northwest Himalayas' },
  { rank: 87, district: 'West Kameng', state: 'Arunachal Pradesh', region: 'Northeast Himalayas' },
  { rank: 88, district: 'Sirmaur', state: 'Himachal Pradesh', region: 'Northwest Himalayas' },
  { rank: 89, district: 'Phek', state: 'Nagaland', region: 'Northeast Himalayas' },
  { rank: 90, district: 'South Garo Hills', state: 'Meghalaya', region: 'Northeast Himalayas' },
  { rank: 91, district: 'Changlang', state: 'Arunachal Pradesh', region: 'Northeast Himalayas' },
  { rank: 92, district: 'Chikmagalur', state: 'Karnataka', region: 'Western Ghats' },
  { rank: 93, district: 'Mon', state: 'Nagaland', region: 'Northeast Himalayas' },
  { rank: 94, district: 'Tuensang', state: 'Nagaland', region: 'Northeast Himalayas' },
  { rank: 95, district: 'Bongaigaon', state: 'Assam', region: 'Northeast Himalayas' },
  { rank: 96, district: 'Lower Dibang Valley', state: 'Arunachal Pradesh', region: 'Northeast Himalayas' },
  { rank: 97, district: 'Senapati', state: 'Manipur', region: 'Northeast Himalayas' },
  { rank: 98, district: 'Srinagar', state: 'Jammu and Kashmir', region: 'Northwest Himalayas' },
  { rank: 99, district: 'Morigaon', state: 'Assam', region: 'Northeast Himalayas' },
  { rank: 100, district: 'Tamenglong', state: 'Manipur', region: 'Northeast Himalayas' },
  { rank: 101, district: 'East Kameng', state: 'Arunachal Pradesh', region: 'Northeast Himalayas' },
  { rank: 102, district: 'Saiha', state: 'Mizoram', region: 'Northeast Himalayas' },
  { rank: 103, district: 'Shimoga', state: 'Karnataka', region: 'Western Ghats' },
  { rank: 104, district: 'Upper Siang', state: 'Arunachal Pradesh', region: 'Northeast Himalayas' },
  { rank: 105, district: 'Mokokchung', state: 'Nagaland', region: 'Northeast Himalayas' },
  { rank: 106, district: 'Kohima', state: 'Nagaland', region: 'Northeast Himalayas' },
  { rank: 107, district: 'Pune', state: 'Maharashtra', region: 'Western Ghats' },
  { rank: 108, district: 'West Siang', state: 'Arunachal Pradesh', region: 'Northeast Himalayas' },
  { rank: 109, district: 'Raigad', state: 'Maharashtra', region: 'Western Ghats' },
  { rank: 110, district: 'Dhalai', state: 'Tripura', region: 'Northeast Himalayas' },
  { rank: 111, district: 'North Goa', state: 'Goa', region: 'Western Ghats' },
  { rank: 112, district: 'Ukhrul', state: 'Manipur', region: 'Northeast Himalayas' },
  { rank: 113, district: 'Kurung Kumey', state: 'Arunachal Pradesh', region: 'Northeast Himalayas' },
  { rank: 114, district: 'Sindhudurg', state: 'Maharashtra', region: 'Western Ghats' },
  { rank: 115, district: 'Tirap', state: 'Arunachal Pradesh', region: 'Northeast Himalayas' },
  { rank: 116, district: 'Uttara Kannada', state: 'Karnataka', region: 'Western Ghats' },
  { rank: 117, district: 'Nagaon', state: 'Assam', region: 'Northeast Himalayas' },
  { rank: 118, district: 'Champhai', state: 'Mizoram', region: 'Northeast Himalayas' },
  { rank: 119, district: 'Budgam', state: 'Jammu and Kashmir', region: 'Northwest Himalayas' },
  { rank: 120, district: 'Upper Subansiri', state: 'Arunachal Pradesh', region: 'Northeast Himalayas' },
  { rank: 121, district: 'South Goa', state: 'Goa', region: 'Western Ghats' },
  { rank: 122, district: 'Chandel', state: 'Manipur', region: 'Northeast Himalayas' },
  { rank: 123, district: 'Kargil', state: 'Ladakh', region: 'Northwest Himalayas' },
  { rank: 124, district: 'Haveri', state: 'Karnataka', region: 'Western Ghats' },
  { rank: 125, district: 'Anjaw', state: 'Arunachal Pradesh', region: 'Northeast Himalayas' },
  { rank: 126, district: 'Lahul and Spiti', state: 'Himachal Pradesh', region: 'Northwest Himalayas' },
  { rank: 127, district: 'Dhubri', state: 'Assam', region: 'Northeast Himalayas' },
  { rank: 128, district: 'Nashik', state: 'Maharashtra', region: 'Western Ghats' },
  { rank: 129, district: 'Ratnagiri', state: 'Maharashtra', region: 'Western Ghats' },
  { rank: 130, district: 'South Tripura', state: 'Tripura', region: 'Northeast Himalayas' },
  { rank: 131, district: 'Ahmednagar', state: 'Maharashtra', region: 'Western Ghats' },
  { rank: 132, district: 'Kupwara', state: 'Jammu and Kashmir', region: 'Northwest Himalayas' },
  { rank: 133, district: 'Kolhapur', state: 'Maharashtra', region: 'Western Ghats' },
  { rank: 134, district: 'Satara', state: 'Maharashtra', region: 'Western Ghats' },
  { rank: 135, district: 'Dibang Valley', state: 'Arunachal Pradesh', region: 'Northeast Himalayas' },
  { rank: 136, district: 'Leh-Ladakh', state: 'Ladakh', region: 'Northwest Himalayas' },
  { rank: 137, district: 'Karimganj', state: 'Assam', region: 'Northeast Himalayas' },
  { rank: 138, district: 'Alappuzha', state: 'Kerala', region: 'Western Ghats' },
  { rank: 139, district: 'Mumbai Suburban', state: 'Maharashtra', region: 'Western Ghats' },
  { rank: 140, district: 'Mumbai', state: 'Maharashtra', region: 'Western Ghats' },
  { rank: 141, district: 'Thoubal', state: 'Manipur', region: 'Northeast Himalayas' },
  { rank: 142, district: 'Imphal East', state: 'Manipur', region: 'Northeast Himalayas' },
  { rank: 143, district: 'Bishnupur', state: 'Manipur', region: 'Northeast Himalayas' },
  { rank: 144, district: 'Zunheboto', state: 'Nagaland', region: 'Northeast Himalayas' },
  { rank: 145, district: 'Wokha', state: 'Nagaland', region: 'Northeast Himalayas' },
  { rank: 146, district: 'Haridwar', state: 'Uttarakhand', region: 'Northwest Himalayas' },
  { rank: 147, district: 'Udham Singh Nagar', state: 'Uttarakhand', region: 'Northwest Himalayas' },
];

// Landmark Case Studies Documented in the Atlas
export const ISRO_LANDMARK_CASES: LandmarkLandslideCase[] = [
  {
    id: 'case-haflong-2022',
    name: 'New Haflong Railway Station Disaster',
    state: 'Assam',
    district: 'Dima Hasao (North Cachar Hills)',
    date: '15-16 May 2022',
    varnesClassification: 'Shallow Translational Debris Flow',
    trigger: 'Intense Monsoon Rainfall (>250mm)',
    keyObservation: 'Massive debris flow on NW slope overtoppled parked train and buried rail lines. Analyzed via Cartosat-2/3 & Sentinel-2.',
    sensorsUsed: ['Cartosat-2 Mx', 'Cartosat-3 Mx', 'Sentinel-2B'],
  },
  {
    id: 'case-tupul-2022',
    name: 'Tupul Railway Station Landslide',
    state: 'Manipur',
    district: 'Noney',
    date: '30 June 2022',
    varnesClassification: 'Rotational Slump with Downslope Debris Channeling',
    trigger: 'Continuous Rainfall on Cut Slopes',
    keyObservation: 'Rotational failure with crown on unstable slope, damming Ijei River. Mapped with RISAT-SAR radar imagery.',
    sensorsUsed: ['RISAT-SAR', 'Resourcesat-2 LISS-IV', 'Sentinel-1'],
  },
  {
    id: 'case-mantam-2016',
    name: 'Mantam Landslide',
    state: 'Sikkim',
    district: 'North District (Mangan)',
    date: '13 August 2016',
    varnesClassification: 'Wedge Failure followed by Translational Slide',
    trigger: 'Extreme Monsoonal Infiltration',
    keyObservation: 'Dammed Kanaka River, forming large landslide lake opposite Passingdang-Mantam road.',
    sensorsUsed: ['Cartosat-2S PAN', 'Landsat-8 OLI'],
  },
  {
    id: 'case-kikruma-2018',
    name: 'Kikruma Landslide (InSAR Predicted)',
    state: 'Nagaland',
    district: 'Phek',
    date: '29 July 2018 (Predicted 26 July 2018)',
    varnesClassification: 'Deep Translational (Planar)',
    trigger: 'Rainfall acceleration on pre-existing creep plane',
    keyObservation: 'Predicted 3 days in advance using Sentinel-1 Multi-Temporal InSAR and inverse velocity (1/v) onset of acceleration (OOA). Dammed Sidzu river.',
    sensorsUsed: ['Sentinel-1 SAR (MT-InSAR / PSI)', 'Cartosat-2S'],
  },
  {
    id: 'case-kotropi-2017',
    name: 'Kotropi Landslide (NH-154)',
    state: 'Himachal Pradesh',
    district: 'Mandi',
    date: '13 August 2017',
    varnesClassification: 'Rotational Crown with Deep Translational Channel Flow',
    trigger: 'Extreme Cloudburst Event',
    keyObservation: 'Completely destroyed NH-154 section between Mandi and Pathankot, burying two state buses.',
    sensorsUsed: ['Resourcesat-2 LISS-IV', 'Cartosat-2E'],
  },
  {
    id: 'case-raunthi-2021',
    name: 'Raunthi Gad Rock Avalanche (Chamoli Disaster)',
    state: 'Uttarakhand',
    district: 'Chamoli',
    date: '7 February 2021',
    varnesClassification: 'Rock Avalanche & Flash Debris Flow',
    trigger: 'Wedge / Joint Failure in Gneissic Bedrock under Glacial Load',
    keyObservation: 'Massive wedge detached from Trishul/Ronti peak, causing flash flood into Dhauliganga river and Tapovan hydel tunnel damage.',
    sensorsUsed: ['Resourcesat-2A LISS-IV', 'Sentinel-2', 'Cartosat-3'],
  },
  {
    id: 'case-puthumala-2019',
    name: 'Puthumala Landslide',
    state: 'Kerala',
    district: 'Wayanad',
    date: '8 August 2019',
    varnesClassification: 'Channelized Debris Flow',
    trigger: 'Hyper-concentrated Monsoon Deluge (>300mm/24h)',
    keyObservation: 'Modeled with 8cm UAV DTM and RAMMS numerical simulation to compute runout velocity and entrainment thickness.',
    sensorsUsed: ['UAV Orthoimage (2cm)', 'CartoDEM (2.5m)', 'Sentinel-2'],
  },
];

// =========================================================================
// ISRO/NRSC Early Warning Empirical Formula (Page 83)
// Binary Logistic Regression Model:
// z = -3.817 + 0.077 * DR + 0.058 * 3DCR + 0.009 * 30DAR
// P(z) = 1 / (1 + exp(-z))
// =========================================================================
export interface IsroEarlyWarningOutput {
  zScore: number;
  triggerProbability: number; // 0 to 1
  triggerPercentage: number; // 0 to 100%
  decisionClass: 'Normal' | 'Advisory' | 'Watch' | 'Warning';
  susceptibilityLevel: 'Moderate' | 'High' | 'Very High' | 'Severe';
  formulaExplanation: string;
}

export function computeIsroEarlyWarning(
  dailyRainfallMm: number, // DR
  threeDayCumulativeMm: number, // 3DCR
  thirtyDayAntecedentMm: number, // 30DAR
  susceptibility: 'Moderate' | 'High' | 'Very High' | 'Severe' = 'High'
): IsroEarlyWarningOutput {
  const z =
    -3.817 +
    0.077 * dailyRainfallMm +
    0.058 * threeDayCumulativeMm +
    0.009 * thirtyDayAntecedentMm;

  // Logistic function
  const probability = 1 / (1 + Math.exp(-z));
  const percentage = Math.round(probability * 1000) / 10; // e.g. 84.5%

  // Table 4. Triggering probability decision matrix
  let decisionClass: 'Normal' | 'Advisory' | 'Watch' | 'Warning' = 'Normal';

  if (probability > 0.85) {
    if (susceptibility === 'Severe' || susceptibility === 'Very High') {
      decisionClass = 'Warning';
    } else if (susceptibility === 'High') {
      decisionClass = 'Watch';
    } else {
      decisionClass = 'Advisory';
    }
  } else if (probability >= 0.75) {
    if (susceptibility === 'Severe') {
      decisionClass = 'Warning';
    } else if (susceptibility === 'Very High' || susceptibility === 'High') {
      decisionClass = 'Watch';
    } else {
      decisionClass = 'Advisory';
    }
  } else if (probability >= 0.5) {
    decisionClass = 'Advisory';
  }

  const formulaExplanation = `z = -3.817 + (0.077 × ${dailyRainfallMm}mm) + (0.058 × ${threeDayCumulativeMm}mm) + (0.009 × ${thirtyDayAntecedentMm}mm) = ${z.toFixed(2)}`;

  return {
    zScore: Math.round(z * 100) / 100,
    triggerProbability: Math.round(probability * 1000) / 1000,
    triggerPercentage: percentage,
    decisionClass,
    susceptibilityLevel: susceptibility,
    formulaExplanation,
  };
}

// Lookup ISRO District Exposure Rank
export function getIsroDistrictRank(districtName: string, stateName?: string): IsroDistrictRanking | undefined {
  const lowerDist = districtName.toLowerCase();
  return ISRO_147_DISTRICT_RANKINGS.find((d) => {
    const matchName =
      d.district.toLowerCase().includes(lowerDist) ||
      lowerDist.includes(d.district.toLowerCase().split(' ')[0]);
    if (stateName) {
      return matchName && (d.state.toLowerCase() === stateName.toLowerCase() || d.state.toLowerCase().includes(stateName.toLowerCase()));
    }
    return matchName;
  });
}
