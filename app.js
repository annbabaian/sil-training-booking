let courses=[];
async function init(){
  try{courses=(await getCourses()).filter(c=>c.status==='active');renderFilters();render()}catch(e){console.error(e);coursesGrid.innerHTML='<div class="empty-state">Տվյալները չեն բեռնվել։ Նախ Supabase-ում run արեք database.sql-ը։</div>'}
}
function renderFilters(){const cats=[...new Set(courses.map(c=>c.category).filter(Boolean))];categoryFilter.innerHTML='<option value="">Բոլոր բաժինները</option>'+cats.map(x=>`<option>${esc(x)}</option>`).join('')}
function render(){const q=searchInput.value.trim().toLowerCase(),cat=categoryFilter.value;const rows=courses.filter(c=>(!cat||c.category===cat)&&(!q||`${c.title} ${c.description||''}`.toLowerCase().includes(q)));coursesGrid.innerHTML=rows.map(c=>`<article class="course-card glass"><div class="course-icon">${esc(c.icon||'🎓')}</div><span class="pill">${esc(c.category||'Դասընթաց')}</span><h2>${esc(c.title)}</h2><p>${esc(c.description||'')}</p><a class="primary-btn" href="course.html?course=${encodeURIComponent(c.slug||c.id)}">Բացել</a></article>`).join('')||'<div class="empty-state">Դասընթաց չի գտնվել։</div>'}
searchInput.oninput=render;categoryFilter.onchange=render;init();
