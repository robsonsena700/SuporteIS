import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { RatingModal } from '../RatingModal';

describe('RatingModal', () => {
  it('blocks low rating without feedback', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getByLabelText, getByText } = render(
      <RatingModal visible onClose={() => {}} onSubmit={onSubmit} loading={false} />
    );

    fireEvent.press(getByLabelText('Definir avaliação 1 estrelas'));
    fireEvent.press(getByText('Confirmar e Resolver'));

    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalled();
    });

    alertSpy.mockRestore();
  });

  it('allows high rating without feedback', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getByLabelText, getByText } = render(
      <RatingModal visible onClose={() => {}} onSubmit={onSubmit} loading={false} />
    );

    fireEvent.press(getByLabelText('Definir avaliação 5 estrelas'));
    fireEvent.press(getByText('Confirmar e Resolver'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(5, '');
    });

    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
