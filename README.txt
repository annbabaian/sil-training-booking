SIL ACADEMY — SUPABASE VERSION

1. Supabase Dashboard → SQL Editor → New query.
2. Open database.sql, copy all text, paste and click Run.
3. Upload all website files to the GitHub repository root.
4. Open admin.html. Initial UI password: SIL2026.
5. Add employees, courses, dates/times, sections, PDFs and images.

PDF / IMAGE UPLOAD
- In a course, add a section.
- Choose “PDF / Ֆայլեր” or “Նկարներ”.
- Click the file button and select one or several files.
- Change the displayed title if needed.
- Click “Պահպանել”.

IMPORTANT SECURITY NOTE
This first deployable version uses public Supabase policies so it works immediately with GitHub Pages.
The Admin password only hides the UI; it is not strong server-side protection.
Before publishing the admin URL widely, the next security step is Supabase Auth and admin-only RLS policies.


V2 additions:
- Runs on the SAME Supabase project. Run database.sql again; it only adds missing tables/policies and starter courses.
- Adds APPA & APPA+ and CASCO & SAFE DRIVE starter courses.
- Adds reusable Speakers manager with photo, name, job title, company, bio and visibility.
- Assign one or more speakers to each course.
