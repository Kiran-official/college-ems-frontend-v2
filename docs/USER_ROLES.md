# SICM EMS — User Roles & Workflows

The system supports three distinct user roles, each with specific permissions and workflows.

## 🔑 Admin Role
High-level administrators responsible for system maintenance and oversight.

- **User Management**: Add, edit, or deactivate students and teachers. Bulk import users via CSV.
- **Department & Semester Admin**: Manage the college's organizational structure.
- **Event Oversight**: View all events across all departments.
- **Certificate Templates**: Create and manage global certificate templates.
- **System Settings**: Configure push notification keys and other global variables.

## 👨‍🏫 Teacher Role
Faculty members assigned to manage specific events and departments.

- **Event Management**: Create new events, set registration deadlines, and manage visibility (internal/external).
- **Faculty-in-Charge**: Manage events where the teacher is assigned as a coordinator.
- **Attendance Tracking**: Mark attendance for registered students.
- **Winner Management**: Select winners for events (individuals or teams).
- **Certificate Generation**: Trigger the generation process for participation and winner certificates.

## 🎓 Student Role
The primary users who participate in events.

- **Event Discovery**: Browse upcoming "Open" events.
- **Registration**: Sign up for individual events or form/join teams for group events.
- **Participation History**: View a dashboard of past events attended.
- **Digital Locker**: Download all earned certificates in PDF format.
- **Profile Management**: Maintain up-to-date contact and academic information.

---

## 🔐 Access Control Matrix

| Feature | Student | Teacher | Admin |
| :--- | :---: | :---: | :---: |
| View Events | ✅ | ✅ | ✅ |
| Register for Events | ✅ | ❌ | ❌ |
| Create Events | ❌ | ✅ | ✅ |
| Mark Attendance | ❌ | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ✅ |
| Generate Certificates| ❌ | ✅ | ✅ |
| Download Certificates| ✅ | ✅* | ✅ |

*\*Teachers can download certificates for the events they manage.*
