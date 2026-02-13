import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/lib/queryKeys';
import * as customDrinkTypeService from '@/services/customDrinkTypeService';

export interface CustomDrinkType {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export function useCustomDrinkTypes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: customTypes = [], isLoading } = useQuery({
    queryKey: queryKeys.customDrinkTypes.list(user?.id ?? ''),
    queryFn: () => customDrinkTypeService.fetchCustomDrinkTypes(user!.id),
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: ({ name, icon, color }: { name: string; icon: string; color: string }) =>
      customDrinkTypeService.addCustomDrinkType(user!.id, name, icon, color),
    onSuccess: (newType) => {
      queryClient.setQueryData<CustomDrinkType[]>(
        queryKeys.customDrinkTypes.list(user!.id),
        (old = []) => [...old, newType]
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: { name?: string; icon?: string; color?: string };
    }) => customDrinkTypeService.updateCustomDrinkType(id, updates),
    onSuccess: (updated) => {
      queryClient.setQueryData<CustomDrinkType[]>(
        queryKeys.customDrinkTypes.list(user!.id),
        (old = []) =>
          old.map((t) => (t.id === updated.id ? updated : t))
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customDrinkTypeService.deleteCustomDrinkType(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.customDrinkTypes.list(user!.id),
      });
      const previous = queryClient.getQueryData<CustomDrinkType[]>(
        queryKeys.customDrinkTypes.list(user!.id)
      );
      queryClient.setQueryData<CustomDrinkType[]>(
        queryKeys.customDrinkTypes.list(user!.id),
        (old = []) => old.filter((t) => t.id !== id)
      );
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.customDrinkTypes.list(user!.id),
          context.previous
        );
      }
    },
  });

  const addCustomType = async (
    name: string,
    icon = '🍹',
    color = '#8B5CF6'
  ) => {
    if (!user) return null;

    const exists = customTypes.some(
      (t) => t.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      return { error: 'A drink type with this name already exists' };
    }

    try {
      const data = await addMutation.mutateAsync({ name, icon, color });
      return { data };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const updateCustomType = async (
    id: string,
    updates: { name?: string; icon?: string; color?: string }
  ) => {
    if (!user) return { error: 'Not authenticated' };

    if (updates.name) {
      const exists = customTypes.some(
        (t) => t.id !== id && t.name.toLowerCase() === updates.name!.toLowerCase()
      );
      if (exists) {
        return { error: 'A drink type with this name already exists' };
      }
    }

    try {
      const data = await updateMutation.mutateAsync({ id, updates });
      return { data };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const deleteCustomType = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      return { data: true };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  return {
    customTypes,
    isLoading,
    addCustomType,
    updateCustomType,
    deleteCustomType,
    refetch: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.customDrinkTypes.list(user?.id ?? ''),
      }),
  };
}
