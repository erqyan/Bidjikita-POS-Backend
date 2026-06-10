import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Key, ToggleLeft, ToggleRight } from 'lucide-react';
import {
  getUsers, createUser, updateUser, toggleUserActive, changePassword, deleteUser,
} from '@/api/users';
import type { User } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/Dialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  TableWrapper, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/Spinner';
import { useToast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';
import { formatDateTime } from '@/lib/utils';

const createSchema = z.object({
  full_name: z.string().min(1, 'Nama lengkap wajib diisi'),
  username: z.string().min(3, 'Username minimal 3 karakter'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  phone_number: z.string().optional(),
});

const editSchema = z.object({
  full_name: z.string().min(1, 'Nama lengkap wajib diisi'),
  phone_number: z.string().optional(),
});

const passwordSchema = z.object({
  new_password: z.string().min(6, 'Password minimal 6 karakter'),
  confirm_password: z.string().min(6),
}).refine((d) => d.new_password === d.confirm_password, {
  message: 'Password tidak cocok', path: ['confirm_password'],
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function UsersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const currentUser = useAuthStore((s) => s.user);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const { data: users = [], isPending } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers().then((r) => r.data),
  });

  const { register: regCreate, handleSubmit: hsCreate, reset: resetCreate, formState: { errors: errCreate, isSubmitting: subCreate } } = useForm<CreateForm>({ resolver: zodResolver(createSchema) });
  const { register: regEdit, handleSubmit: hsEdit, reset: resetEdit, formState: { errors: errEdit, isSubmitting: subEdit } } = useForm<EditForm>({ resolver: zodResolver(editSchema) });
  const { register: regPw, handleSubmit: hsPw, reset: resetPw, formState: { errors: errPw, isSubmitting: subPw } } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const createMutation = useMutation({
    mutationFn: (data: CreateForm) => createUser(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast({ title: 'Berhasil', description: 'Pengguna ditambahkan', variant: 'success' }); setCreateOpen(false); resetCreate(); },
    onError: (err: unknown) => { toast({ title: 'Gagal', description: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error', variant: 'destructive' }); },
  });

  const editMutation = useMutation({
    mutationFn: (data: EditForm) => updateUser(editTarget!.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast({ title: 'Berhasil', description: 'Data pengguna diperbarui', variant: 'success' }); setEditTarget(null); },
    onError: (err: unknown) => { toast({ title: 'Gagal', description: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error', variant: 'destructive' }); },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => toggleUserActive(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast({ title: 'Berhasil', description: 'Status pengguna diubah', variant: 'success' }); },
    onError: () => { toast({ title: 'Gagal', description: 'Gagal mengubah status', variant: 'destructive' }); },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: PasswordForm) => changePassword(passwordTarget!.id, data.new_password),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast({ title: 'Berhasil', description: 'Password berhasil diubah', variant: 'success' }); setPasswordTarget(null); resetPw(); },
    onError: (err: unknown) => { toast({ title: 'Gagal', description: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error', variant: 'destructive' }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast({ title: 'Berhasil', description: 'Pengguna dihapus', variant: 'success' }); setDeleteTarget(null); },
    onError: (err: unknown) => { toast({ title: 'Gagal', description: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error', variant: 'destructive' }); setDeleteTarget(null); },
  });

  const isSelf = (u: User) => currentUser?.id === u.id;

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{users.length} pengguna terdaftar</p>
        <Button onClick={() => { resetCreate(); setCreateOpen(true); }}><Plus className="h-4 w-4" /> Tambah Pengguna</Button>
      </div>

      {isPending ? <PageLoader /> : users.length === 0 ? (
        <EmptyState title="Belum ada pengguna" />
      ) : (
        <TableWrapper>
          <TableHeader>
            <tr>
              <TableHead>No</TableHead>
              <TableHead>Nama Lengkap</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>No. Telepon</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Login Terakhir</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {users.map((u, i) => (
              <TableRow key={u.id}>
                <TableCell className="text-gray-500">{i + 1}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-bold">
                      {(u.full_name?.[0] || u.username[0]).toUpperCase()}
                    </div>
                    <span className="font-medium">{u.full_name || '-'}</span>
                    {isSelf(u) && <Badge variant="info" className="text-xs">Anda</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-gray-600">@{u.username}</TableCell>
                <TableCell className="text-gray-600">{u.phone_number || '-'}</TableCell>
                <TableCell>
                  <Badge variant={u.Role?.role_name === 'admin' ? 'warning' : 'default'}>
                    {u.Role?.role_name || 'cashier'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={u.is_active ? 'success' : 'danger'}>
                    {u.is_active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-500 text-xs">
                  {u.last_login ? formatDateTime(u.last_login) : 'Belum pernah'}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost" size="icon-sm"
                      onClick={() => { setEditTarget(u); resetEdit({ full_name: u.full_name, phone_number: u.phone_number }); }}
                      title="Edit"
                    ><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button
                      variant="ghost" size="icon-sm"
                      onClick={() => !isSelf(u) && toggleMutation.mutate(u.id)}
                      disabled={isSelf(u)}
                      title={u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    >
                      {u.is_active
                        ? <ToggleRight className="h-4 w-4 text-green-600" />
                        : <ToggleLeft className="h-4 w-4 text-gray-400" />}
                    </Button>
                    <Button
                      variant="ghost" size="icon-sm"
                      onClick={() => { setPasswordTarget(u); resetPw(); }}
                      title="Ganti Password"
                    ><Key className="h-3.5 w-3.5" /></Button>
                    <Button
                      variant="ghost" size="icon-sm"
                      className="text-red-500 hover:bg-red-50 disabled:opacity-30"
                      onClick={() => !isSelf(u) && setDeleteTarget(u)}
                      disabled={isSelf(u)}
                      title={isSelf(u) ? 'Tidak dapat menghapus akun sendiri' : 'Hapus'}
                    ><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableWrapper>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Tambah Pengguna</DialogTitle></DialogHeader>
          <form onSubmit={hsCreate((d) => createMutation.mutate(d))} className="space-y-4">
            <Input label="Nama Lengkap" {...regCreate('full_name')} error={errCreate.full_name?.message} />
            <Input label="Username" {...regCreate('username')} error={errCreate.username?.message} />
            <Input label="Password" type="password" {...regCreate('password')} error={errCreate.password?.message} helperText="Minimal 6 karakter" />
            <Input label="No. Telepon (Opsional)" {...regCreate('phone_number')} placeholder="+62..." />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
              <Button type="submit" loading={subCreate}>Tambah Pengguna</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Pengguna</DialogTitle></DialogHeader>
          <form onSubmit={hsEdit((d) => editMutation.mutate(d))} className="space-y-4">
            <Input label="Nama Lengkap" {...regEdit('full_name')} error={errEdit.full_name?.message} />
            <Input label="No. Telepon" {...regEdit('phone_number')} placeholder="+62..." />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Batal</Button>
              <Button type="submit" loading={subEdit}>Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={!!passwordTarget} onOpenChange={(v) => !v && setPasswordTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ganti Password</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 -mt-2 mb-4">Ganti password untuk <strong>{passwordTarget?.full_name || passwordTarget?.username}</strong></p>
          <form onSubmit={hsPw((d) => passwordMutation.mutate(d))} className="space-y-4">
            <Input label="Password Baru" type="password" {...regPw('new_password')} error={errPw.new_password?.message} helperText="Minimal 6 karakter" />
            <Input label="Konfirmasi Password" type="password" {...regPw('confirm_password')} error={errPw.confirm_password?.message} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPasswordTarget(null)}>Batal</Button>
              <Button type="submit" loading={subPw}>Ganti Password</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Hapus Pengguna"
        description={`Yakin ingin menghapus pengguna "${deleteTarget?.full_name || deleteTarget?.username}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        confirmLabel="Hapus Pengguna"
      />
    </div>
  );
}
