const $ = s => document.querySelector(s);
function uid(prefix='id'){return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`}
function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function formatDate(v){if(!v)return '';return new Intl.DateTimeFormat('hy-AM',{day:'2-digit',month:'long',year:'numeric'}).format(new Date(v+'T00:00:00'))}
function toast(text){const e=$('#toast');if(!e){alert(text);return}e.textContent=text;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2600)}
async function uploadAcademyFile(file, courseId, sectionId){
  const safe=(file.name||'file').replace(/[^a-zA-Z0-9._-]/g,'_');
  const path=`${courseId}/${sectionId}/${Date.now()}-${safe}`;
  const {error}=await sb.storage.from(FILE_BUCKET).upload(path,file,{upsert:false,contentType:file.type||undefined});
  if(error) throw error;
  const {data}=sb.storage.from(FILE_BUCKET).getPublicUrl(path);
  return {name:file.name,url:data.publicUrl,path,mime:file.type||'',size:file.size||0};
}
async function deleteAcademyFile(path){if(!path)return;const {error}=await sb.storage.from(FILE_BUCKET).remove([path]);if(error)throw error}
async function getCourses(){const {data,error}=await sb.from('academy_courses').select('*').order('created_at');if(error)throw error;return data||[]}
async function getCourseFull(id){
  const [{data:course,error:e1},{data:sessions,error:e2},{data:sections,error:e3},{data:employees,error:e4},{data:bookings,error:e5},{data:speakerLinks,error:e6}] = await Promise.all([
    sb.from('academy_courses').select('*').eq('id',id).single(),
    sb.from('academy_sessions').select('*').eq('course_id',id).order('session_date').order('sort_order'),
    sb.from('academy_sections').select('*').eq('course_id',id).order('sort_order'),
    sb.from('academy_employees').select('*').order('full_name'),
    sb.from('academy_bookings').select('*').eq('course_id',id),
    sb.from('academy_course_speakers').select('sort_order,speaker:academy_speakers(*)').eq('course_id',id).order('sort_order')
  ]);
  if(e1)throw e1;if(e2)throw e2;if(e3)throw e3;if(e4)throw e4;if(e5)throw e5;if(e6)throw e6;
  return {course,sessions:sessions||[],sections:sections||[],employees:employees||[],bookings:bookings||[],speakers:(speakerLinks||[]).map(x=>x.speaker).filter(Boolean)};
}
