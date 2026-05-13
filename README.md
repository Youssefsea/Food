<div align="center">

# 🍔 Food Delivery App

### منصة توصيل الطعام المتكاملة

[![Next.js](https://img.shields.io/badge/Next.js-16.1.4-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.3-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Client-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" alt="-----------------------------------------------------" />

**تطبيق متكامل لتوصيل الطعام يربط بين العملاء والمطاعم بتجربة سلسة وحديثة**

[🚀 البدء السريع](#-البدء-السريع) •
[✨ المميزات](#-المميزات) •
[📱 الصفحات](#-الصفحات) •
[🛠️ التقنيات](#️-التقنيات)

</div>

---

## 📋 نظرة عامة

تطبيق **Food Delivery** هو منصة متكاملة لتوصيل الطعام مبنية بأحدث التقنيات. يوفر التطبيق واجهتين رئيسيتين:

- 🛒 **واجهة العملاء**: لتصفح المطاعم، إضافة الأطباق للسلة، إتمام الطلبات، والتواصل المباشر مع المطاعم
- 🏪 **لوحة تحكم البائعين**: لإدارة المطعم، الأطباق، الطلبات، والرد على رسائل العملاء

---

## ✨ المميزات

<table>
<tr>
<td width="50%">

### 👤 للعملاء
- 🔍 **استكشاف المطاعم** مع فلاتر متقدمة
- 🗺️ **تحديد الموقع بالـ GPS** مع حساب المسافة
- 🛒 **سلة ذكية** تدعم مطاعم متعددة
- 💳 **نظام دفع مرن** (فودافون كاش / إنستاباي)
- 📷 **رفع إثبات الدفع** مع معاينة الصورة
- 📅 **حجز مسبق** للمطاعم
- 💬 **محادثة فورية** مع المطعم عن طريق الطلب

</td>
<td width="50%">

### 🏪 للبائعين
- 📊 **لوحة تحكم شاملة** مع إحصائيات
- 🍽️ **إدارة الأطباق** (إضافة/تعديل/حذف)
- 📦 **إدارة الطلبات** مع تتبع الحالات
- ⚙️ **إعدادات المطعم** والموقع
- 🔔 **إشعارات فورية** للطلبات الجديدة
- 📈 **إحصائيات المبيعات** والأطباق الأكثر مبيعاً
- 💬 **محادثة فورية** مع العملاء

</td>
</tr>
</table>

### 🌟 مميزات تقنية
- ⚡ **أداء فائق** مع Next.js 16 App Router
- 🎨 **تصميم عصري** متجاوب مع جميع الشاشات
- 🌙 **RTL Support** دعم كامل للغة العربية
- 🗺️ **خرائط تفاعلية** مع Leaflet
- ✨ **انيميشن سلس** مع Framer Motion
- 🔒 **مصادقة آمنة** مع JWT
- ⚡ **محادثة لحظية** مع Socket.IO

---

## 📱 الصفحات

### 🛒 واجهة العملاء

| الصفحة | المسار | الوصف |
|--------|--------|-------|
| 🏠 **الاستكشاف** | `/explore` | تصفح المطاعم مع البحث والفلاتر |
| 🍽️ **المطعم** | `/restaurant/[name]` | عرض قائمة الأطباق مع التفاصيل |
| 🛒 **السلة** | `/cart` | إدارة السلة وإتمام الطلب |
| 🔐 **تسجيل الدخول** | `/login` | صفحة تسجيل الدخول |
| 📝 **إنشاء حساب** | `/signup` | التسجيل كعميل أو بائع |
| 💬 **المحادثات** | `/customer/chat` | قائمة محادثات الطلبات |

### 🏪 لوحة تحكم البائعين

| الصفحة | المسار | الوصف |
|--------|--------|-------|
| 📊 **لوحة التحكم** | `/vendor/dashboard` | الإحصائيات والنظرة العامة |
| 🍽️ **الأطباق** | `/vendor/dishes` | إدارة قائمة الأطباق |
| 📦 **الطلبات** | `/vendor/orders` | إدارة ومتابعة الطلبات |
| ⚙️ **الإعدادات** | `/vendor/EditAtVendorInfo` | إعدادات المطعم والحساب |
| 💬 **المحادثات** | `/vendor/chat` | قائمة محادثات العملاء |

---

## 🛠️ التقنيات

<div align="center">

| التقنية | الإصدار | الاستخدام |
|---------|---------|-----------|
| ![Next.js](https://img.shields.io/badge/-Next.js-000000?style=flat-square&logo=next.js) | 16.1.4 | إطار العمل الرئيسي |
| ![React](https://img.shields.io/badge/-React-61DAFB?style=flat-square&logo=react&logoColor=black) | 19.2.3 | مكتبة واجهات المستخدم |
| ![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white) | 5.x | Type Safety |
| ![Tailwind CSS](https://img.shields.io/badge/-Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white) | 4.x | التصميم والتنسيق |
| ![Framer Motion](https://img.shields.io/badge/-Framer_Motion-0055FF?style=flat-square&logo=framer&logoColor=white) | 12.x | الانيميشن |
| ![Leaflet](https://img.shields.io/badge/-Leaflet-199900?style=flat-square&logo=leaflet&logoColor=white) | 1.9.4 | الخرائط التفاعلية |
| ![Socket.io](https://img.shields.io/badge/-Socket.io_Client-010101?style=flat-square&logo=socket.io&logoColor=white) | Latest | المحادثة الفورية |
| ![Lucide](https://img.shields.io/badge/-Lucide_Icons-F56565?style=flat-square) | 0.563 | الأيقونات |

</div>

---

## 🚀 البدء السريع

### المتطلبات

- **Node.js** >= 18.0.0
- **npm** أو **yarn** أو **pnpm**

### التثبيت

```bash
# 1️⃣ استنساخ المشروع
git clone https://github.com/Youssefsea/Food_front.git

# 2️⃣ الانتقال للمجلد
cd Food_front/frontend

# 3️⃣ تثبيت المكتبات
npm install

# 4️⃣ تشغيل التطبيق
npm run dev
```

التطبيق سيعمل على: **http://localhost:3000**

### 🔧 إعداد البيئة

أنشئ ملف `.env.local`:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3444
```

---

## 📁 هيكل المشروع

```
frontend/
├── 📂 app/                          # Next.js App Router
│   ├── 📄 layout.tsx                # التخطيط الرئيسي
│   ├── 📄 page.tsx                  # الصفحة الرئيسية
│   ├── 📄 globals.css               # الأنماط العامة
│   │
│   ├── 📂 cart/                     # 🛒 صفحة السلة
│   │   ├── 📄 page.tsx
│   │   ├── 📄 types.ts
│   │   └── 📂 components/
│   │       ├── CartHeader.tsx
│   │       ├── CheckoutButton.tsx
│   │       ├── DeliveryLocation.tsx
│   │       ├── DishItem.tsx
│   │       ├── LocationPickerModal.tsx
│   │       ├── OrderSummary.tsx
│   │       ├── PaymentMethod.tsx
│   │       ├── PaymentProofUpload.tsx
│   │       └── RestaurantSelector.tsx
│   │
│   ├── 📂 explore/                  # 🔍 استكشاف المطاعم
│   │   ├── 📄 page.tsx
│   │   └── 📂 componentForExplore/
│   │       ├── Header.tsx
│   │       ├── SearchBar.tsx
│   │       ├── FilterChips.tsx
│   │       ├── RestaurantCard.tsx
│   │       └── BottomNavigation.tsx
│   │
│   ├── 📂 restaurant/               # 🍽️ صفحة المطعم
│   │   └── 📂 [restaurant_name]/
│   │       ├── 📄 page.tsx
│   │       └── 📂 components/
│   │           ├── CategoryTabs.tsx
│   │           ├── DishCard.tsx
│   │           ├── DishDetailModal.tsx
│   │           └── FloatingCartBar.tsx
│   │
│   ├── 📂 vendor/                   # 🏪 لوحة تحكم البائعين
│   │   ├── 📂 dashboard/
│   │   │   ├── 📄 page.tsx
│   │   │   └── 📂 components/
│   │   │       ├── DashboardHeader.tsx
│   │   │       ├── Sidebar.tsx
│   │   │       ├── StatsCards.tsx
│   │   │       ├── RecentOrdersTable.tsx
│   │   │       └── TopSellingDishes.tsx
│   │   │
│   │   ├── 📂 dishes/               # إدارة الأطباق
│   │   ├── 📂 orders/               # إدارة الطلبات
│   │   ├── 📂 chat/                 # 💬 محادثات العملاء
│   │   └── 📂 EditAtVendorInfo/     # الإعدادات
│   │
│   ├── 📂 login/                    # 🔐 تسجيل الدخول
│   ├── 📂 signup/                   # 📝 إنشاء حساب
│   │   ├── 📂 customer/
│   │   └── 📂 vendor/
│   │
│   └── 📂 customer/
│       └── 📂 chat/                 # 💬 محادثات العميل
│
├── 📄 axios.js                      # إعداد Axios
├── 📄 package.json
├── 📄 tsconfig.json
├── 📄 tailwind.config.ts
└── 📄 next.config.ts
```

---

## 🔌 API Endpoints

### 👤 العملاء

| Method | Endpoint | الوصف |
|--------|----------|-------|
| `POST` | `/customer/login` | تسجيل الدخول |
| `POST` | `/customer/signup` | إنشاء حساب جديد |
| `GET` | `/restaurant/all` | جلب جميع المطاعم |
| `POST` | `/customer/nearest-restaurants` | المطاعم القريبة بالموقع |
| `GET` | `/customer/view-cart` | عرض السلة |
| `POST` | `/customer/add-dish-to-cart` | إضافة للسلة |
| `PUT` | `/customer/update-dish-quantity-in-cart` | تعديل الكمية |
| `DELETE` | `/customer/remove-dish-from-cart` | حذف من السلة |
| `POST` | `/customer/place-order` | إنشاء طلب |
| `POST` | `/customer/upload-payment-proof` | رفع إثبات الدفع |
| `POST` | `/customer/payment-status` | متابعة حالة الدفع |
| `GET` | `/customer/chat-rooms` | جلب غرف المحادثة |
| `GET` | `/customer/chat-room/order/:orderId` | غرفة محادثة طلب معين |
| `GET` | `/customer/chat-messages/:roomId` | رسائل غرفة محادثة |

### 🏪 البائعين

| Method | Endpoint | الوصف |
|--------|----------|-------|
| `POST` | `/restaurant/login` | تسجيل الدخول |
| `GET` | `/restaurant/dashboard` | بيانات لوحة التحكم |
| `GET` | `/restaurant/profile` | بيانات المطعم |
| `PUT` | `/restaurant/change-info` | تعديل بيانات المطعم |
| `GET` | `/restaurant/dishes` | جلب الأطباق |
| `POST` | `/restaurant/add-dish` | إضافة طبق |
| `PUT` | `/restaurant/change-dish` | تعديل طبق |
| `DELETE` | `/restaurant/delete-dish` | حذف طبق |
| `GET` | `/restaurant/orders` | جلب الطلبات |
| `POST` | `/restaurant/order-status` | تحديث حالة الطلب |
| `GET` | `/restaurant/chat-rooms` | جلب غرف المحادثة |
| `GET` | `/restaurant/chat-room/order/:orderId` | غرفة محادثة طلب معين |
| `GET` | `/restaurant/chat-messages/:roomId` | رسائل غرفة محادثة |

---

## ⚡ Real-Time Chat (Socket.IO)

التطبيق يستخدم **Socket.IO** للمحادثة الفورية بين العملاء والمطاعم، وكل غرفة محادثة مرتبطة بطلب معين.

### الاتصال

```typescript
import { io, Socket } from "socket.io-client";

const socket: Socket = io(process.env.NEXT_PUBLIC_API_URL!, {
  auth: { token: localStorage.getItem("customerToken") },
});
```

> 🔐 **المصادقة:** يتم التحقق من الـ JWT عند الاتصال، ويدعم السيرفر إرسال التوكن عن طريق `auth.token`، الـ `Authorization` header، أو الـ cookie.

---

### Socket Events

#### 📤 من العميل للسيرفر

| الحدث | البيانات | الوصف |
|-------|---------|-------|
| `joinRoom` | `roomId: number` | الدخول لغرفة محادثة |
| `sendMessage` | `{ roomId, message }` | إرسال رسالة |
| `leaveRoom` | `roomId: number` | الخروج من الغرفة |

#### 📥 من السيرفر للعميل

| الحدث | البيانات | الوصف |
|-------|---------|-------|
| `joinedRoom` | `{ roomId, message }` | تأكيد الدخول للغرفة |
| `previousMessages` | `Message[]` | الرسائل السابقة عند الدخول |
| `newMessage` | `Message` | رسالة جديدة في الغرفة |
| `error` | `{ message }` | خطأ في أي عملية |

---

### شكل الرسالة

```typescript
interface Message {
  id: number;
  room_id: number;
  sender_id: number;
  sender_name: string;
  sender_role: "customer" | "restaurant";
  message: string;
  created_at: string;
}
```

---

### مثال الاستخدام

```typescript
// 1. اتصل بالسيرفر
const socket = io(process.env.NEXT_PUBLIC_API_URL!, {
  auth: { token: localStorage.getItem("customerToken") },
});

// 2. ادخل غرفة المحادثة
socket.emit("joinRoom", roomId);

// 3. استقبل الرسائل السابقة
socket.on("previousMessages", (messages: Message[]) => {
  setMessages(messages);
});

// 4. استقبل الرسائل الجديدة في الوقت الفعلي
socket.on("newMessage", (msg: Message) => {
  setMessages((prev) => [...prev, msg]);
});

// 5. أرسل رسالة
socket.emit("sendMessage", { roomId, message: "هل طلبي جاهز؟" });

// 6. اخرج من الغرفة عند مغادرة الصفحة
return () => {
  socket.emit("leaveRoom", roomId);
  socket.disconnect();
};
```

---

### سيناريو المحادثة الكامل

```
العميل يفتح شاشة المحادثة
        │
        ▼
GET /customer/chat-room/order/:orderId  ← جلب بيانات الغرفة
        │
        ▼
socket.emit('joinRoom', roomId)  ← الدخول للغرفة
        │
        ▼
socket.on('previousMessages')  ← استقبال التاريخ
        │
        ▼
socket.on('newMessage')  ← الاستماع للرسائل الجديدة
        │
        ▼
socket.emit('sendMessage', {...})  ← إرسال رسالة
        │
        ▼
io.to(room).emit('newMessage')  ← البث لكل المتصلين في الغرفة
```

---

## 🎨 التصميم

### 🎨 الألوان الرئيسية

| اللون | الكود | الاستخدام |
|-------|-------|-----------|
| 🟠 **Primary** | `#E5A04D` | اللون الأساسي |
| ⚫ **Dark** | `#1A1A1A` | النصوص الرئيسية |
| ⚪ **Gray** | `#6B7280` | النصوص الثانوية |
| 🟢 **Success** | `#10B981` | حالات النجاح |
| 🔴 **Error** | `#EF4444` | حالات الخطأ |

### 📱 Responsive Design

التطبيق متجاوب مع جميع أحجام الشاشات:

- 📱 **Mobile**: 320px - 768px
- 📱 **Tablet**: 768px - 1024px
- 💻 **Desktop**: 1024px+

---

## 🧪 الأوامر المتاحة

```bash
# 🔧 التطوير
npm run dev          # تشغيل وضع التطوير

# 🏗️ البناء
npm run build        # بناء المشروع للإنتاج

# 🚀 التشغيل
npm run start        # تشغيل وضع الإنتاج

# 🔍 الفحص
npm run lint         # فحص الأكواد
```

---

## 📝 ملاحظات مهمة

### 💳 نظام الدفع

- **طلبات التوصيل الفوري:** الدفع عند الاستلام (كاش)
- **طلبات الحجز المسبق:** يتطلب رفع صورة إثبات الدفع (فودافون كاش أو إنستاباي) قبل تأكيد الطلب

### 🗺️ نظام تحديد الموقع

- يستخدم GPS لتحديد موقع العميل تلقائياً
- يحسب المسافة بين العميل والمطعم باستخدام **Haversine Formula**
- رسوم التوصيل = المسافة (كم) × رسوم الكيلومتر المحددة من المطعم

### 🛒 السلة الذكية

- تدعم إضافة أطباق من مطاعم متعددة في نفس الوقت
- عند الطلب، يجب اختيار مطعم واحد فقط لكل طلب
- يمكن العودة لإتمام باقي المطاعم بعد إتمام الطلب الأول

### 💬 نظام المحادثة

المحادثة متاحة **فقط** في الحالة التالية:
- الطلب من نوع **حجز** (وليس توصيل فوري)
- تم **تأكيد الدفع** من قبل الأدمن

في أي حالة أخرى (دفع معلق أو مرفوض أو طلب توصيل) لا تظهر خاصية المحادثة.

| الحالة | متاحة؟ |
|--------|--------|
| طلب حجز + دفع مؤكد | ✅ |
| طلب حجز + دفع معلق | ❌ |
| طلب حجز + دفع مرفوض | ❌ |
| طلب توصيل فوري | ❌ |

---

## 🤝 المساهمة

نرحب بمساهماتكم! يرجى اتباع الخطوات التالية:

1. **Fork** المشروع
2. أنشئ **Branch** جديد (`git checkout -b feature/amazing-feature`)
3. **Commit** التغييرات (`git commit -m 'Add amazing feature'`)
4. **Push** إلى الـ Branch (`git push origin feature/amazing-feature`)
5. افتح **Pull Request**

---

## 📄 الرخصة

هذا المشروع مرخص تحت رخصة **MIT** - راجع ملف [LICENSE](LICENSE) للتفاصيل.

---

<div align="center">

### 💖 شكراً لاستخدامك التطبيق!

**صنع بـ ❤️ في مصر 🇪🇬**

[![GitHub stars](https://img.shields.io/github/stars/Youssefsea/Food_front?style=social)](https://github.com/Youssefsea/Food_front/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/Youssefsea/Food_front?style=social)](https://github.com/Youssefsea/Food_front/network/members)

</div>