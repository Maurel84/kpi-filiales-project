import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type ModeleRow = Pick<
  Database['public']['Tables']['modeles_produits']['Row'],
  'id' | 'code_modele' | 'nom_complet' | 'marque_id' | 'categorie_id'
>;
type MarqueRow = Pick<Database['public']['Tables']['marques']['Row'], 'id' | 'nom'>;
type CategorieRow = Pick<
  Database['public']['Tables']['categories_produits']['Row'],
  'id' | 'nom' | 'marque_id'
>;

export type ModeleOption = {
  id: string;
  code: string;
  label: string;
  marque: string | null;
  gamme: string | null;
};

export type MarqueOption = {
  id: string;
  nom: string;
};

export type CategorieOption = {
  id: string;
  nom: string;
  marque_id: string | null;
};

type PaysRow = Database['public']['Tables']['pays_reference']['Row'];
type VendeurRow = Database['public']['Tables']['vendeurs_reference']['Row'];

export function useListeReference() {
  const [modeles, setModeles] = useState<ModeleOption[]>([]);
  const [marques, setMarques] = useState<MarqueOption[]>([]);
  const [categories, setCategories] = useState<CategorieOption[]>([]);
  const [pays, setPays] = useState<string[]>([]);
  const [vendeurs, setVendeurs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [
        { data: modelesData },
        { data: marquesData },
        { data: categoriesData },
        { data: paysData },
        { data: vendeursData },
      ] = await Promise.all([
        supabase
          .from('modeles_produits')
          .select('id, code_modele, nom_complet, marque_id, categorie_id')
          .order('nom_complet', { ascending: true }),
        supabase.from('marques').select('id, nom').eq('actif', true).order('nom'),
        supabase.from('categories_produits').select('id, nom, marque_id').eq('actif', true).order('nom'),
        supabase.from('pays_reference').select('nom').eq('actif', true).order('nom'),
        supabase.from('vendeurs_reference').select('nom').eq('actif', true).order('nom'),
      ]);

      if (!mounted) return;
      if (modelesData) {
        const marqueMap = new Map<string, string>();
        (marquesData as MarqueRow[] | null | undefined)?.forEach((row) => {
          if (row.id && row.nom) marqueMap.set(row.id, row.nom);
        });
        const categorieMap = new Map<string, string>();
        (categoriesData as CategorieRow[] | null | undefined)?.forEach((row) => {
          if (row.id && row.nom) categorieMap.set(row.id, row.nom);
        });

        const options = (modelesData as ModeleRow[]).map((row) => ({
          id: row.id,
          code: row.code_modele || row.nom_complet,
          label: row.nom_complet || row.code_modele,
          marque: row.marque_id ? marqueMap.get(row.marque_id) ?? null : null,
          gamme: row.categorie_id ? categorieMap.get(row.categorie_id) ?? null : null,
        }));
        setModeles(options);
      }
      if (marquesData) {
        setMarques(marquesData as MarqueRow[]);
      }
      if (categoriesData) {
        setCategories(categoriesData as CategorieRow[]);
      }
      if (paysData) {
        setPays((paysData as PaysRow[]).map((row) => row.nom));
      }
      if (vendeursData) {
        setVendeurs((vendeursData as VendeurRow[]).map((row) => row.nom));
      }
      setLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const modeleLookup = useMemo(() => {
    const map = new Map<string, ModeleOption>();
    modeles.forEach((item) => {
      if (item.label) {
        map.set(item.label.toLowerCase(), item);
      }
      if (item.code) {
        map.set(item.code.toLowerCase(), item);
      }
    });
    return map;
  }, [modeles]);

  return { modeles, modeleLookup, marques, categories, pays, vendeurs, loading };
}
