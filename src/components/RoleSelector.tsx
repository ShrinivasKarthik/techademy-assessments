import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Users, GraduationCap, Shield } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  permissions: string[];
  recommended?: boolean;
}

interface RoleSelectorProps {
  selectedRole?: string;
  onRoleSelect: (role: string) => void;
  disabled?: boolean;
  showPermissions?: boolean;
}

const RoleSelector: React.FC<RoleSelectorProps> = ({
  selectedRole,
  onRoleSelect,
  disabled = false,
  showPermissions = true
}) => {
  const roles: Role[] = [
    {
      id: 'user',
      name: 'user',
      label: 'Standard User',
      description: 'Basic access to take assessments and view results',
      icon: <UserCheck className="h-6 w-6" />,
      permissions: [
        'Take assessments',
        'View own results',
        'Basic profile management'
      ]
    },
    {
      id: 'student',
      name: 'student',
      label: 'Student',
      description: 'Enhanced access for academic users',
      icon: <GraduationCap className="h-6 w-6" />,
      permissions: [
        'Take assessments',
        'View detailed results',
        'Access learning resources',
        'Track progress over time'
      ],
      recommended: true
    },
    {
      id: 'instructor',
      name: 'instructor',
      label: 'Instructor',
      description: 'Create and manage assessments, view student results',
      icon: <Users className="h-6 w-6" />,
      permissions: [
        'Create assessments',
        'Manage questions',
        'View all student results',
        'Generate reports',
        'Moderate assessments'
      ]
    },
    {
      id: 'admin',
      name: 'admin',
      label: 'Administrator',
      description: 'Full system access and user management',
      icon: <Shield className="h-6 w-6" />,
      permissions: [
        'Full system access',
        'User management',
        'System configuration',
        'All assessment features',
        'Analytics and reporting'
      ]
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Select User Role</h3>
        <p className="text-sm text-muted-foreground">
          Choose the appropriate role based on how this user will interact with the system.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map((role) => (
          <Card 
            key={role.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedRole === role.name 
                ? 'ring-2 ring-primary bg-primary/5' 
                : 'hover:border-primary/50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !disabled && onRoleSelect(role.name)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    selectedRole === role.name 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    {role.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold">{role.label}</h4>
                    {role.recommended && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        Recommended
                      </Badge>
                    )}
                  </div>
                </div>
                {selectedRole === role.name && (
                  <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground mb-3">
                {role.description}
              </p>
              
              {showPermissions && (
                <div>
                  <h5 className="font-medium text-xs mb-2 text-muted-foreground uppercase tracking-wide">
                    Permissions
                  </h5>
                  <ul className="space-y-1">
                    {role.permissions.map((permission, index) => (
                      <li key={index} className="text-xs text-muted-foreground flex items-center">
                        <div className="w-1 h-1 bg-muted-foreground rounded-full mr-2" />
                        {permission}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedRole && (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm">
            <strong>Selected:</strong> {roles.find(r => r.name === selectedRole)?.label}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            This role will determine the user's access level and available features.
          </p>
        </div>
      )}
    </div>
  );
};

export default RoleSelector;