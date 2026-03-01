import pandas as pd

df_emissions = pd.read_csv('emissions-from-food.csv')
df_share = pd.read_csv('food-share-total-emissions.csv')

merged_df = pd.merge(
    df_emissions,
    df_share,
    on=['Entity', 'Code', 'Year'],
    how='inner'
)

merged_df.to_csv('merged_emissions_and_food_share_data.csv', index=False)