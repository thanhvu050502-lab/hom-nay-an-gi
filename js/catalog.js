// Danh mục cố định: tag, khung giá, ghép combo, dịp lễ, danh mục món tham khảo.
export const CUISINE = ['Việt','Nhật','Hàn','Trung','Thái','Âu','Ấn','Khác'];
export const GROUPS = {
  'Món chính': ['Cơm','Xôi & cháo','Bún & phở','Mì & hủ tiếu','Bánh mì','Bánh & cuốn','Lẩu','Nướng','Hải sản','Món gà & vịt','Sushi & món Nhật','Pizza & mì Ý','Món chay'],
  'Ăn vặt': ['Ăn vặt đường phố','Chiên & xiên','Bánh ngọt','Chè & kem'],
  'Đồ uống': ['Cà phê','Trà sữa','Trà & nước ép','Sinh tố & đá xay'],
  'Đồ nhậu': ['Mồi nhậu','Ốc','Bia & cocktail']
};
export const GNAMES = Object.keys(GROUPS);
export const FORM = GNAMES.flatMap(g => GROUPS[g]);
export function groupOf(t){ for (const g of GNAMES) if (GROUPS[g].includes(t)) return g; return ''; }
export const SHORT = {'Ăn vặt đường phố':'Ăn vặt','Sushi & món Nhật':'Món Nhật','Pizza & mì Ý':'Món Ý','Món gà & vịt':'Gà, vịt','Sinh tố & đá xay':'Sinh tố','Trà & nước ép':'Trà, nước ép','Bia & cocktail':'Bia rượu','Mì & hủ tiếu':'Mì, hủ tiếu','Bánh & cuốn':'Bánh, cuốn','Chiên & xiên':'Chiên, xiên','Xôi & cháo':'Xôi, cháo','Bún & phở':'Bún, phở','Chè & kem':'Chè, kem'};
export const TYPE = ['Vỉa hè','Quán ăn','Quán nhậu','Nhà hàng','Cà phê','Bar','Tiệm dessert'];
export const MOOD = ['Muốn quẩy','Chill','Khám phá','Ăn nhẹ'];
export const TAG_MOOD = ['Muốn quẩy','Chill','Khám phá','Ăn nhẹ'];
export const MEAL = ['Sáng','Trưa','Xế chiều','Tối','Khuya'];
export const OCCASION = ['Sinh nhật, kỷ niệm','Tiếp khách','Lễ Tết'];
export const WEATHER = ['Hợp ngày mưa','Hợp ngày nóng','Có máy lạnh'];
export const WHO = ['Một mình','Cặp đôi','Nhóm bạn','Gia đình'];
// Vòng quay khi chưa có quán nào: các loại món phổ biến theo bữa
export const FREE_WHEEL = { 'Sáng':['Bún & phở','Bánh mì','Xôi & cháo','Cơm','Mì & hủ tiếu','Bánh & cuốn','Cà phê','Trà & nước ép'], 'Trưa':['Cơm','Bún & phở','Mì & hủ tiếu','Bánh & cuốn','Món gà & vịt','Sushi & món Nhật','Món chay','Bánh mì'], 'Xế chiều':['Ăn vặt đường phố','Chiên & xiên','Chè & kem','Bánh ngọt','Trà sữa','Cà phê','Sinh tố & đá xay','Bánh & cuốn'], 'Tối':['Lẩu','Nướng','Hải sản','Cơm','Bún & phở','Sushi & món Nhật','Pizza & mì Ý','Ốc'], 'Khuya':['Mồi nhậu','Ốc','Xôi & cháo','Mì & hủ tiếu','Bún & phở','Chiên & xiên','Bánh mì','Ăn vặt đường phố'] };
export const SWEET = [...GROUPS['Đồ uống'], 'Bánh ngọt', 'Chè & kem'];
export const DEFAULT_FOOD = [[0,100],[100,200],[200,350],[350,500],[500,9999]];
export const DEFAULT_DRINK = [[0,50],[50,100],[100,200],[200,9999]];
export const RADII = [1,3,5];

export function bandLabel(b){
  if (b[0] === 0) return 'Dưới ' + b[1] + 'k';
  if (b[1] >= 9999) return 'Trên ' + b[0] + 'k';
  return b[0] + '–' + b[1] + 'k';
}

export function mealNow(d = new Date()){
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 5 && h < 10) return 'Sáng';
  if (h >= 10 && h < 14) return 'Trưa';
  if (h >= 14 && h < 17) return 'Xế chiều';
  if (h >= 17 && h < 22) return 'Tối';
  return 'Khuya';
}

// Bảng ghép combo mặc định (Spec mục 5). Sửa được trong Nhóm › Cài đặt.
export const DEFAULT_COMBO = [
  { id:'cay', label:'Cay, nóng (lẩu, món Hàn, món Thái)', when:{ form:['Lẩu'], cuisine:['Hàn','Thái'] }, next:['Chè & kem','Trà & nước ép'] },
  { id:'nuong', label:'Nướng, nhiều dầu mỡ', when:{ form:['Nướng','Mồi nhậu','Món gà & vịt','Chiên & xiên'] }, next:['Trà & nước ép','Sinh tố & đá xay'] },
  { id:'nhe', label:'Ăn nhẹ (món nước, cơm)', when:{ form:['Bún & phở','Mì & hủ tiếu','Cơm','Xôi & cháo','Bánh mì','Bánh & cuốn'] }, next:['Bánh ngọt','Cà phê','Trà sữa'] },
  { id:'nhau', label:'Quán nhậu → ăn khuya', when:{ type:['Quán nhậu','Bar'] }, next:['Xôi & cháo','Mì & hủ tiếu'] }
];

// Dịp lễ: tháng-ngày dương lịch, kèm vài ngày âm lịch đã quy đổi cho 2026–2027.
const FIXED = [['02-14','Valentine','Sinh nhật, kỷ niệm'],['03-08','8/3','Sinh nhật, kỷ niệm'],['10-20','20/10','Sinh nhật, kỷ niệm'],['11-20','20/11','Lễ Tết'],['12-24','Giáng sinh','Lễ Tết'],['12-31','Giao thừa','Lễ Tết'],['01-01','Tết Dương lịch','Lễ Tết'],['04-30','30/4','Lễ Tết'],['09-02','2/9','Lễ Tết']];
const LUNAR = [['2026-02-17','Tết Nguyên đán'],['2026-03-03','Rằm tháng Giêng'],['2026-09-25','Trung thu'],['2027-02-06','Tết Nguyên đán'],['2027-02-20','Rằm tháng Giêng'],['2027-09-15','Trung thu']];
export function upcomingOccasion(now = new Date()){
  const list = [];
  for (const y of [now.getFullYear(), now.getFullYear() + 1]) for (const f of FIXED) list.push({ d:new Date(y + '-' + f[0] + 'T12:00:00'), name:f[1], tag:f[2] });
  for (const l of LUNAR) list.push({ d:new Date(l[0] + 'T12:00:00'), name:l[1], tag:'Lễ Tết' });
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  let best = null;
  for (const o of list){ const days = Math.round((o.d - today) / 864e5); if (days >= 0 && days <= 3 && (!best || days < best.days)) best = { ...o, days }; }
  return best;
}

// Danh mục món tham khảo (giá nghìn đồng/phần).
const CAT_SRC = {"Cơm":"Cơm tấm sườn bì chả:45|Cơm gà xối mỡ:45|Cơm gà Hải Nam:60|Cơm chiên dương châu:50|Cơm chiên hải sản:65|Cơm niêu:90|Cơm văn phòng:40|Cơm cháy kho quẹt:70|Cơm bò lúc lắc:75|Cơm rang dưa bò:55","Xôi & cháo":"Xôi mặn:25|Xôi gà:35|Xôi xéo:20|Cháo lòng:35|Cháo sườn:30|Cháo ếch Singapore:90|Cháo vịt:50|Cháo cá:45|Súp cua:30","Bún & phở":"Phở bò:60|Phở gà:55|Bún bò Huế:55|Bún riêu:45|Bún chả Hà Nội:55|Bún thịt nướng:45|Bún mắm:65|Bún đậu mắm tôm:60|Bún cá:45|Bún mọc:45|Bún chả cá:45|Bánh canh cua:65|Bánh canh giò heo:50|Bún măng vịt:55","Mì & hủ tiếu":"Hủ tiếu Nam Vang:55|Hủ tiếu gõ:25|Hủ tiếu bò kho:55|Mì hoành thánh:50|Mì vịt tiềm:80|Mì Quảng:45|Cao lầu:50|Mì xào giòn:65|Miến gà:45|Miến lươn:55|Nui xào bò:50|Mì trộn:35|Ramen:120|Udon:110","Bánh mì":"Bánh mì thịt:25|Bánh mì chả cá:20|Bánh mì xíu mại:25|Bánh mì chảo:45|Bánh mì heo quay:30|Bánh mì ốp la:20|Bánh mì bò kho:50|Bánh mì que:15","Bánh & cuốn":"Bánh xèo:60|Bánh cuốn nóng:35|Bánh khọt:55|Bánh bèo:35|Bánh bột lọc:35|Bánh ướt lòng gà:45|Gỏi cuốn:30|Bò bía:20|Bánh tráng cuốn thịt heo:90|Bánh căn:45|Bánh hỏi heo quay:55|Nem nướng Nha Trang:60","Lẩu":"Lẩu Thái:180|Lẩu bò:200|Lẩu gà lá é:170|Lẩu dê:220|Lẩu mắm:200|Lẩu cá kèo:180|Lẩu hải sản:230|Lẩu nấm:190|Lẩu riêu cua bắp bò:200|Lẩu ếch:170|Lẩu Tứ Xuyên:250","Nướng":"Ba chỉ nướng:150|Bò nướng tảng:220|Sườn nướng:120|Nướng Hàn Quốc:250|Gà nướng muối ớt:160|Nướng ngói:180|Thịt xiên nướng:15|Bò lá lốt:70|Dê nướng:200","Hải sản":"Cua rang me:350|Ghẹ hấp:250|Tôm nướng muối ớt:180|Mực nướng sa tế:160|Hàu nướng phô mai:25|Cá lóc nướng trui:200|Nghêu hấp sả:90|Càng cúm rang muối:180|Cá hồi sashimi:220","Món gà & vịt":"Gà rán:45|Gà nướng lu:220|Gà hấp hành:200|Vịt quay:180|Vịt nướng chao:220|Gà ủ muối:200|Chân gà sả tắc:60|Cánh gà chiên mắm:70|Phá lấu:35","Sushi & món Nhật":"Sushi set:200|Sashimi tổng hợp:300|Cơm cà ri Nhật:110|Tonkatsu:140|Tempura:120|Takoyaki:40|Okonomiyaki:120|Cơm lươn Nhật:280|Gyudon:90","Pizza & mì Ý":"Pizza Margherita:180|Pizza hải sản:220|Mì Ý sốt bò bằm:110|Mì Ý carbonara:130|Burger bò:90|Bít tết:220|Lasagna:150|Salad Caesar:95","Món chay":"Cơm chay:40|Bún chay:40|Lẩu nấm chay:160|Bánh mì chay:20|Hủ tiếu chay:35|Gỏi cuốn chay:25|Đậu hũ sốt cà:45|Bánh bao chay:20","Ăn vặt đường phố":"Bánh tráng trộn:25|Bánh tráng nướng:25|Bột chiên:35|Há cảo:35|Xíu mại:30|Bắp xào:25|Trứng vịt lộn:10|Gỏi khô bò:30|Bánh flan:12|Súp cua óc heo:40|Bánh bao:20|Khoai lang lắc:25","Chiên & xiên":"Cá viên chiên:25|Xiên que nướng:10|Nem chua rán:40|Khoai tây chiên:35|Gà viên chiên:35|Bánh gối:15|Chả giò:40|Tokbokki:55|Phô mai que:30","Bánh ngọt":"Bánh cheesecake:65|Tiramisu:65|Bánh su kem:15|Bánh croissant:40|Bánh mousse:60|Bánh tart trứng:20|Bánh bông lan trứng muối:45|Donut:25|Bánh crepe sầu riêng:60|Bingsu:90","Chè & kem":"Chè Thái:30|Chè khúc bạch:35|Chè bưởi:25|Chè đậu:20|Tàu hũ nước đường:15|Sâm bổ lượng:30|Kem dừa:40|Kem gelato:55|Kem bơ:35|Rau câu dừa:15|Sữa chua nếp cẩm:25","Cà phê":"Cà phê sữa đá:25|Cà phê đen:20|Bạc xỉu:30|Cà phê muối:35|Cà phê trứng:40|Americano:45|Latte:55|Cappuccino:55|Cold brew:55|Cà phê dừa:45","Trà sữa":"Trà sữa trân châu:40|Trà sữa matcha:50|Trà sữa ô long:45|Sữa tươi trân châu đường đen:45|Trà sữa khoai môn:45|Hồng trà sữa:40|Trà sữa nướng:45","Trà & nước ép":"Trà đào cam sả:45|Trà vải:45|Trà tắc:20|Trà chanh:20|Trà ô long:35|Nước mía:15|Nước cam ép:35|Nước dừa:25|Nước ép dưa hấu:35|Rau má đậu xanh:25|Sữa đậu nành:12","Sinh tố & đá xay":"Sinh tố bơ:40|Sinh tố xoài:35|Sinh tố dâu:40|Matcha đá xay:60|Cookie đá xay:60|Sữa chua đá xay:45|Dừa tắc:25","Mồi nhậu":"Lòng nướng:90|Đậu hũ chiên sả:50|Khô mực nướng:120|Gỏi gà măng cụt:150|Ếch chiên bơ:120|Dồi sụn nướng:90|Bò tái chanh:130|Chân gà nướng:80|Vú dê nướng:160|Gỏi bò tái me:120|Đậu phộng rang:20","Ốc":"Ốc len xào dừa:70|Ốc hương rang muối:120|Ốc móng tay xào me:80|Sò điệp nướng mỡ hành:90|Sò huyết rang me:80|Ốc bươu nhồi thịt:90|Nghêu hấp Thái:80|Ốc mỡ xào bơ tỏi:75","Bia & cocktail":"Bia tươi:35|Bia craft:95|Cocktail:160|Mojito:140|Rượu soju:90|Highball:150|Rượu vang ly:150|Sake:180"};
export const CAT = FORM.flatMap(t => (CAT_SRC[t] || '').split('|').filter(Boolean).map(x => { const p = x.split(':'); return { name:p[0], type:t, group:groupOf(t), price:+p[1], src:'cat' }; }));
export const PB = [[0,50,'Dưới 50k'],[50,100,'50–100k'],[100,200,'100–200k'],[200,1e9,'Trên 200k']];

// Món mẫu cũ của bản dùng thử -> loại món mới
export const OLDF = {'Món nước':'Bún & phở','Món khô':'Mì & hủ tiếu','Ăn vặt':'Ăn vặt đường phố','Nhậu':'Mồi nhậu','Dessert':'Chè & kem','Đồ uống':'Cà phê'};
