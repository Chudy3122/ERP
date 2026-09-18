interface UserName {
  first_name?: string | null;
  last_name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  id?: string;
}

const nameCollator = new Intl.Collator('pl', { sensitivity: 'base', numeric: true });

export const formatUserName = (user?: UserName | null, fallback = ''): string =>
  [user?.last_name ?? user?.lastName, user?.first_name ?? user?.firstName]
    .map(part => part?.trim())
    .filter(Boolean)
    .join(' ') || user?.email?.trim() || fallback;

export const compareUsersByLastName = (first?: UserName | null, second?: UserName | null): number => {
  const firstLastName = (first?.last_name ?? first?.lastName ?? '').trim();
  const secondLastName = (second?.last_name ?? second?.lastName ?? '').trim();

  // Osoby bez nazwiska trafiaja na koniec listy.
  if (Boolean(firstLastName) !== Boolean(secondLastName)) return firstLastName ? -1 : 1;

  return nameCollator.compare(firstLastName, secondLastName)
    || nameCollator.compare(
      (first?.first_name ?? first?.firstName ?? '').trim(),
      (second?.first_name ?? second?.firstName ?? '').trim(),
    )
    || nameCollator.compare(first?.email ?? '', second?.email ?? '')
    || nameCollator.compare(first?.id ?? '', second?.id ?? '');
};
