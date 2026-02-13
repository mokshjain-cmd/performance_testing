# API Usage Examples

## Create Session with cURL

```bash
curl -X POST http://localhost:3000/api/sessions/create \
  -F "sessionName=Gaming Performance Test" \
  -F "activity=Mobile Gaming" \
  -F "startTime=2026-02-13T10:00:00Z" \
  -F "endTime=2026-02-13T11:00:00Z" \
  -F "deviceTypes[]=iPhone 14 Pro" \
  -F "deviceTypes[]=Samsung Galaxy S23" \
  -F "deviceFiles[]=@/path/to/iphone_raw_data.csv" \
  -F "deviceFiles[]=@/path/to/samsung_raw_data.csv"
```

## Create Session with JavaScript/Fetch

```javascript
const formData = new FormData();
formData.append('sessionName', 'Gaming Performance Test');
formData.append('activity', 'Mobile Gaming');
formData.append('startTime', '2026-02-13T10:00:00Z');
formData.append('endTime', '2026-02-13T11:00:00Z');
formData.append('deviceTypes[]', 'iPhone 14 Pro');
formData.append('deviceTypes[]', 'Samsung Galaxy S23');
formData.append('deviceFiles[]', iphoneFile); // File object
formData.append('deviceFiles[]', samsungFile); // File object

const response = await fetch('http://localhost:3000/api/sessions/create', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result);
```

## Create Device

```bash
curl -X POST http://localhost:3000/api/devices \
  -H "Content-Type: application/json" \
  -d '{
    "deviceType": "iPhone 14 Pro",
    "manufacturer": "Apple",
    "model": "iPhone14,3",
    "screenSize": "6.1 inch",
    "resolution": "2556x1179",
    "processor": "A16 Bionic",
    "ram": "6GB",
    "os": "iOS",
    "osVersion": "17.0"
  }'
```

## Get All Sessions

```bash
curl http://localhost:3000/api/sessions
```

## Get Session by ID

```bash
curl http://localhost:3000/api/sessions/65a1b2c3d4e5f6g7h8i9j0k1
```

## Get Device by Type

```bash
curl http://localhost:3000/api/devices/iPhone%2014%20Pro
```

## Health Check

```bash
curl http://localhost:3000/api/health
```
