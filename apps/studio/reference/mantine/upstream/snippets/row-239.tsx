import { HeartIcon } from '@phosphor-icons/react';
import { ActionIcon, VisuallyHidden } from '@mantine/core';

export function Demo() {
  return (
    <ActionIcon>
      <HeartIcon />
      <VisuallyHidden>Like post</VisuallyHidden>
    </ActionIcon>
  );
}
