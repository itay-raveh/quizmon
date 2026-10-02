import { useNavigate, useSearch } from '@tanstack/react-router';
import { useAppGameContext } from '../../app/AppGameContext';
import { AccountScreen } from './AccountScreen';

export const AccountRouteScreen = ({
  friendId = '',
}: {
  friendId?: string;
}) => {
  const { trainer } = useAppGameContext();
  const navigate = useNavigate();
  return (
    <AccountScreen
      trainer={trainer}
      onRename={(name) => trainer.updateProfile({ ...trainer.profile, name })}
      onEditCard={() => void navigate({ to: '/trainer/edit' })}
      onViewPlayer={(id) =>
        void navigate({
          to: '/players/$id',
          params: { id },
          search: { from: 'friends', friendId },
        })
      }
      friendId={friendId}
    />
  );
};

export const FriendsRouteScreen = () => {
  const { id } = useSearch({ from: '/account_/friends' });
  return <AccountRouteScreen friendId={id} />;
};
