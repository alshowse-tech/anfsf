"use strict";
/**
 * ANFSF V1.5.0 - Skill Base Classes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Skill = void 0;
class Skill {
    getMetadata() {
        return {
            name: this.name,
            version: this.version,
            description: this.description,
        };
    }
}
exports.Skill = Skill;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9za2lsbHMvYmFzZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7O0dBRUc7OztBQVdILE1BQXNCLEtBQUs7SUFPekIsV0FBVztRQUNULE9BQU87WUFDTCxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87WUFDckIsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO1NBQzlCLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFkRCxzQkFjQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQU5GU0YgVjEuNS4wIC0gU2tpbGwgQmFzZSBDbGFzc2VzXG4gKi9cblxuZXhwb3J0IGludGVyZmFjZSBTa2lsbFJlc3VsdCB7XG4gIGV4ZWN1dGlvblRpbWU/OiBudW1iZXI7XG4gIG1ldGFkYXRhPzogUmVjb3JkPHN0cmluZywgYW55Pjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTa2lsbENvbnRleHQge1xuICBba2V5OiBzdHJpbmddOiBhbnk7XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBTa2lsbCB7XG4gIGFic3RyYWN0IG5hbWU6IHN0cmluZztcbiAgYWJzdHJhY3QgdmVyc2lvbjogc3RyaW5nO1xuICBhYnN0cmFjdCBkZXNjcmlwdGlvbjogc3RyaW5nO1xuXG4gIGFic3RyYWN0IGV4ZWN1dGUoY3R4OiBTa2lsbENvbnRleHQpOiBQcm9taXNlPFNraWxsUmVzdWx0PjtcblxuICBnZXRNZXRhZGF0YSgpOiBSZWNvcmQ8c3RyaW5nLCBhbnk+IHtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogdGhpcy5uYW1lLFxuICAgICAgdmVyc2lvbjogdGhpcy52ZXJzaW9uLFxuICAgICAgZGVzY3JpcHRpb246IHRoaXMuZGVzY3JpcHRpb24sXG4gICAgfTtcbiAgfVxufVxuIl19