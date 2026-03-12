import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import VacancyCard from '@/components/VacancyCard';
import { STATUS_CONFIG } from '@/components/StatusBadge';

const STATUSES = Object.keys(STATUS_CONFIG);

export default function VacanciesKanban() {
  const queryClient = useQueryClient();
  const { data: vacancies = [], isLoading } = useQuery({
    queryKey: ['vacancies'],
    queryFn: () => base44.entities.Vacancy.list('-created_date', 500),
  });

  const grouped = STATUSES.reduce((acc, s) => {
    acc[s] = vacancies.filter(v => v.status === s);
    return acc;
  }, {});

  const onDragEnd = async ({ draggableId, destination }) => {
    if (!destination) return;
    const newStatus = destination.droppableId;
    await base44.entities.Vacancy.update(draggableId, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: ['vacancies'] });
  };

  if (isLoading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#6c63ff] rounded-full animate-spin" /></div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Kanban</h1>
      <p className="text-gray-500 text-sm mb-6">Перетаскивайте карточки для смены статуса</p>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUSES.map(status => (
            <div key={status} className="flex-shrink-0 w-64">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">{STATUS_CONFIG[status].label}</span>
                <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 font-medium">{grouped[status].length}</span>
              </div>
              <Droppable droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-32 rounded-xl p-2 space-y-2 transition-colors ${snapshot.isDraggingOver ? 'bg-[#6c63ff]/5 border-2 border-dashed border-[#6c63ff]/30' : 'bg-gray-100/50'}`}
                  >
                    {grouped[status].map((vacancy, index) => (
                      <Draggable key={vacancy.id} draggableId={vacancy.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <VacancyCard vacancy={vacancy} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {grouped[status].length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">Пусто</p>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}