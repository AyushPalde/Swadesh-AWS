# SWADESH BLUEPRINT (single source of truth)
## 1. Roles
citizen    - can post issues, support issues, view feed, view own reports
authority  - everything a citizen can + verify, prioritise, assign, update status, see stats
## 2. Enumerations
STATUS      PENDING_VERIFICATION | VERIFIED | ASSIGNED | IN_PROGRESS | RESOLVED | REJECTED
PRIORITY    LOW | MEDIUM | HIGH
CATEGORY    POTHOLE | GARBAGE | STREETLIGHT | WATER_LEAKAGE | DRAINAGE | OTHER
DEPARTMENT  ROADS      = "Roads & Infrastructure"
            SANITATION = "Sanitation & Waste"
            ELECTRICAL = "Street Lighting & Electrical"
            WATER      = "Water Supply & Drainage"
            PARKS      = "Parks & Public Spaces"
## 3. Workflow (allowed status transitions)
PENDING_VERIFICATION -> VERIFIED   (authority; priority REQUIRED)
PENDING_VERIFICATION -> REJECTED   (authority; note REQUIRED)
VERIFIED             -> ASSIGNED   (ONLY via POST /issues/{id}/assign)
ASSIGNED             -> IN_PROGRESS (authority; note optional)
IN_PROGRESS          -> RESOLVED   (authority; note REQUIRED)
RESOLVED and REJECTED are final. Every transition appends to statusHistory.
## 4. DynamoDB tables (region us-east-1, on-demand capacity)
Table swadesh-users   : PK userId (String)           attrs: name, email, role, createdAt
Table swadesh-issues  : PK issueId (String)
   GSI gsi_status_createdAt   : PK status (S),     SK createdAt (S)   projection ALL
   GSI gsi_reporter_createdAt : PK reporterId (S), SK createdAt (S)   projection ALL
userId  = "u_"   + first 12 hex chars of sha256(lowercase email)
issueId = "iss_" + 12 random hex chars
Dates are ISO-8601 UTC strings. upvotedBy is a DynamoDB String Set (internal, never returned).
## 5. Issue object (as returned by the API)
{
  "issueId": "iss_8f3a1c2b9d04",
  "title": "Deep pothole near Andheri Subway",
  "description": "...",
  "category": "POTHOLE",
  "location": { "address": "Andheri Subway, Mumbai", "lat": 19.1197, "lng": 72.8464 },
  "imageKey": "issues/ab12cd34/photo.jpg",
  "imageUrl": "https://... (presigned GET url, valid 1 hour, or null)",
  "status": "PENDING_VERIFICATION",
  "priority": null, "department": null, "assignedTo": null,
  "reporterId": "u_1a2b3c4d5e6f", "reporterName": "Asha Patil",
  "upvoteCount": 12, "viewerHasUpvoted": false,
  "statusHistory": [ { "status": "PENDING_VERIFICATION", "by": "Asha Patil",
                       "note": "Issue reported", "at": "2026-10-28T09:30:00Z" } ],
  "createdAt": "2026-10-28T09:30:00Z", "updatedAt": "2026-10-28T09:30:00Z"
}
## 6. Endpoints (API Gateway HTTP API, payload format 2.0, JSON only)
POST  /login                 public   {name,email,role,passcode?}        -> {token,user}
POST  /upload-url            auth     {fileName,contentType}             -> {uploadUrl,imageKey}
POST  /issues                auth     {title,description,category,location,imageKey?} -> Issue (201)
GET   /issues                auth     ?status&category&mine=true&sort=recent|top&limit&cursor
                                      ->
 {items,nextCursor}
GET   /issues/{id}           auth                                        -> Issue
POST  /issues/{id}/upvote    auth     toggles support                    -> {upvoteCount,upvoted}
PATCH /issues/{id}/status    authority {status,note?,priority?}          -> Issue
POST  /issues/{id}/assign    authority {department,assignedTo}           -> Issue

GET   /stats                 authority                                   -> {totals,byStatus,
                                                                  byCategory,byDepartment}
GET   /health                public                                      -> {ok:true,service,time}
Validation: title 5-100 chars, description 10-1000, address required,
            images jpeg/png/webp, max 5 MB.
Pagination: limit default 20, max 50; nextCursor is an opaque string or null.
## 7. Auth
Header "Authorization: Bearer <token>". Token = HS256 JWT {sub:userId,name,role,exp 24h}.
Authority login requires the passcode held in the Lambda env var AUTHORITY_PASSCODE.
## 8. Error format and codes
{ "error": { "code": "VALIDATION_ERROR", "message": "...",
             "details": [ {"field":"title","message":"..."} ] } }
VALIDATION_ERROR 400 | UNAUTHORIZED 401 | FORBIDDEN 403 | NOT_FOUND 404
INVALID_TRANSITION 409 | INTERNAL_ERROR 500
## 9. Environment variables
Frontend: VITE_API_BASE_URL, VITE_USE_MOCK
Lambda:   ISSUES_TABLE, USERS_TABLE, IMAGE_BUCKET, JWT_SECRET, AUTHORITY_PASSCODE,
          DATA_STORE (dynamo|memory), S3_MODE (aws|local), LOG_LEVEL