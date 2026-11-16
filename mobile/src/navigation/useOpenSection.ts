import { useNavigation } from '@react-navigation/native';
import type { SectionDef } from '../data/sections';

interface NavLike {
  navigate: (name: string) => void;
  getParent?: () => NavLike | undefined;
}

/**
 * Opens any canonical section from anywhere inside the deck tabs:
 * tab sections switch tabs; stack sections are pushed on the parent
 * root stack. One contained cast keeps React Navigation's nested
 * navigator typing out of every screen.
 */
export function useOpenSection(): (section: SectionDef) => void {
  const navigation = useNavigation() as unknown as NavLike;
  return (section: SectionDef) => {
    if (section.target.kind === 'tab') {
      navigation.navigate(section.target.tab);
    } else {
      const parent = navigation.getParent?.();
      (parent ?? navigation).navigate(section.target.screen);
    }
  };
}
