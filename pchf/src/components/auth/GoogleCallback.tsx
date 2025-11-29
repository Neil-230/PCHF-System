import { useEffect, useRef, useState } from 'react';
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
  const didToast = useRef(false);

  useEffect(() => {
    const token = searchParams.get('token');
    const userStr = searchParams.get('user');
    const signupRequired = searchParams.get('signup') === 'required';
    const isPending = searchParams.get('pending') === '1';
    const errorCode = searchParams.get('error');
    const errorMessage = searchParams.get('message');

    if (errorCode) {
      if (!didToast.current) {
        const friendlyMap: Record<string, string> = {
          invalid_state: 'The sign-in session expired. Please try again.',
          oauth_failed: 'We could not complete the social login. Please try again or use email/password.',
        };
        const decoded = errorMessage ? decodeURIComponent(errorMessage) : '';
        toast.error(decoded || friendlyMap[errorCode] || 'Unable to complete social login. Please try again.');
        didToast.current = true;
      }
      navigate('/login', { replace: true });
      return;
    }

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        apiService.setToken(token);
        if(!didToast.current) {
          toast.success('Login successful!');
          didToast.current = true;
        }
        navigate('/dashboard', { replace: true });
      } catch (err) {
        console.error('Error parsing Google callback:', err);
        if(!didToast.current) {
          toast.error('Authentication failed');
        }
        didToast.current = true;
        navigate('/login', { replace: true });
      }
      return;
    }

    if (isPending) {
        if (!didToast.current){
          toast.error('Your account is awaiting owner/admin approval. Please try again later.');
        }
      didToast.current = true;
      navigate('/login', { replace: true });
      return;
    }

    if (signupRequired && userStr) {
      try {
        const minimal = JSON.parse(decodeURIComponent(userStr));
        setSocialData(minimal);
        setShowRoleModal(true);
        if(!didToast.current) {
          toast.info('Almost there! Choose a role so we can finish creating your account.');
        }
        didToast.current = true;
      } catch {
        navigate('/login', { replace: true });
      }
      return;
    }

    navigate('/login', { replace: true });
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
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete signup. If you created an email/password account already, please finish verification there.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal show={showRoleModal} centered backdrop="static">
      <Modal.Header>
        <Modal.Title>Finish setting up your account</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="mb-3">
          We received your profile from {socialData?.googleId ? 'Google' : 'Facebook'}. To finish creating your account you must
          pick a role. After this step you’ll always sign in using {socialData?.googleId ? 'Google' : 'Facebook'}.
        </p>
        <ul className="small text-muted mb-3 ps-3">
          <li>Admins require owner approval before they can log in.</li>
          <li>If you already created an email/password account, go back and finish verification there instead of linking.</li>
        </ul>
        <Label htmlFor="role" className="fw-bold">Choose Role</Label>
        <Select
          value={selectedRole}
          onChange={(value) => setSelectedRole(value as 'admin' | 'cashier')}
        >
          <SelectItem value="cashier">Cashier</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
        </Select>
      </Modal.Body>
      <Modal.Footer className="d-flex justify-content-between align-items-center">
        <small className="text-muted">
          Need to use email/password instead?
          <Button variant="link" className="p-0 ms-1" onClick={() => navigate('/login', { replace: true })}>Go back</Button>
        </small>
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
