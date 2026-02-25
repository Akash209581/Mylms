-- =============================================
-- SAMPLE DATA FOR DEVELOPMENT/TESTING
-- =============================================

-- Note: Replace UUIDs with actual auth.users IDs from your Supabase Auth

-- Insert a sample instructor (after creating auth user)
-- INSERT INTO public.users (id, name, email, role)
-- VALUES ('INSTRUCTOR_AUTH_UUID', 'John Instructor', 'instructor@example.com', 'INSTRUCTOR');

-- Insert sample courses
INSERT INTO public.courses (title, description, category, level, duration_hours, price, is_published)
VALUES
  ('Introduction to Web Development', 'Learn the basics of HTML, CSS, and JavaScript', 'Web Development', 'BEGINNER', 40, 0, TRUE),
  ('Advanced React & Next.js', 'Master modern React patterns and Next.js framework', 'Web Development', 'ADVANCED', 60, 89.99, TRUE),
  ('Python for Data Science', 'Learn Python programming for data analysis and machine learning', 'Data Science', 'INTERMEDIATE', 50, 79.99, TRUE),
  ('UI/UX Design Fundamentals', 'Master the principles of user interface and experience design', 'Design', 'BEGINNER', 30, 59.99, TRUE);

-- Note: Modules, lessons, and enrollments should be added as courses are created
