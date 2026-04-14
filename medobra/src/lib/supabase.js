import { createClient } from '@supabase/supabase-js'

const SUPA_URL = 'https://mzssjzayfcltygcwosgy.supabase.co'
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16c3NqemF5ZmNsdHlnY3dvc2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MzcxMTQsImV4cCI6MjA4OTMxMzExNH0.bHTa2QpyiKy71Y2wV37y2FlST3RgWZy22FlOdkF7czQ'

export const supabase = createClient(SUPA_URL, SUPA_KEY)