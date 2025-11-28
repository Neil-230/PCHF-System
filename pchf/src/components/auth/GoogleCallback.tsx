import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Modal } from 'react-bootstrap';
import { Button } from '../ui/button';
import { Select, SelectItem } from '../ui/select';
import { Label } from '../ui/label';
import apiService from '../../services/api';

export function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'cashier'>('cashier');
  const [isLoading, setIsLoading] = useState(false);
  const [socialData, setSocialData] = useState<any>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const userStr = searchParams.get('user');
    const signupRequired = searchParams.get('signup') === 'required';

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        apiService.setToken(token);
        toast.success('Login successful!');
        navigate('/dashboard');
      } catch (err) {
        console.error('Error parsing Google callback:', err);
        toast.error('Authentication failed');
        navigate('/login');
      }
      return;
    }

    if (signupRequired && userStr) {
      try {
        const minimal = JSON.parse(decodeURIComponent(userStr));
        setSocialData(minimal);
        setShowRoleModal(true);
        toast.message('Complete signup to continue');
      } catch {
        navigate('/login');
      }
      return;
    }

    navigate('/login');
  }, [searchParams, navigate]);

  const handleRoleSelection = async () => {
    if (!socialData) return;

    setIsLoading(true);
    try {
      let resp: any;
      if (socialData.googleId) {
        resp = await apiService.googleSignupWithRole(
          socialData.googleId,
          socialData.name,
          socialData.email,
          selectedRole
        );
      } else if (socialData.facebookId) {
        resp = await apiService.facebookSignupWithRole(
          socialData.facebookId,
          socialData.name,
          socialData.email,
          selectedRole
        );
      } else {
        throw new Error('Unsupported provider');
      }

      if (resp.token) {
        apiService.setToken(resp.token);
      }

      toast.success(
        selectedRole === 'admin'
          ? 'Admin request submitted! Pending owner approval.'
          : 'Account pending for approval!'
      );
      
      setShowRoleModal(false);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete signup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal show={showRoleModal} centered backdrop="static">
      <Modal.Header>
        <Modal.Title>Select Your Role</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="mb-3">Welcome! Please select your role to complete your account setup.</p>
        <Label htmlFor="role" className="fw-bold">Role</Label>
        <Select
          value={selectedRole}
          onChange={(value) => setSelectedRole(value as 'admin' | 'cashier')}
        >
          <SelectItem value="cashier">Cashier</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
        </Select>
      </Modal.Body>
      <Modal.Footer>
        <Button 
          className="bg-dark" 
          onClick={handleRoleSelection}
          disabled={isLoading}
        >
          {isLoading ? 'Setting up...' : 'Continue'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
